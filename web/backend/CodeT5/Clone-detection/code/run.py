# coding=utf-8
# Copyright 2018 The Google AI Language Team Authors and The HuggingFace Inc. team.
# Copyright (c) 2018, NVIDIA CORPORATION.  All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""
Fine-tuning the library models for language modeling on a text file (GPT, GPT-2, BERT, RoBERTa).
GPT and GPT-2 are fine-tuned using a causal language modeling (CLM) loss while BERT and RoBERTa are fine-tuned
using a masked language modeling (MLM) loss.
"""

from __future__ import absolute_import, division, print_function
import os
import sys
sys.path.append('../../../')
sys.path.append('../../../python_parser')
retval = os.getcwd()

import logging
import pickle
import random
import argparse
import json
import numpy as np
import torch
from torch.utils.data import DataLoader, Dataset, SequentialSampler, RandomSampler
from torch.utils.data.distributed import DistributedSampler
from transformers import (AdamW, get_linear_schedule_with_warmup,
                          RobertaConfig, RobertaModel, RobertaTokenizer,
                          BartConfig, BartForConditionalGeneration, BartTokenizer,
                          T5Config, T5ForConditionalGeneration, T5Tokenizer)
from sklearn.metrics import recall_score, precision_score, f1_score
import time
from tqdm import tqdm, trange
import multiprocessing
from model import Model

MODEL_CLASSES = {'roberta': (RobertaConfig, RobertaModel, RobertaTokenizer),
                 't5': (T5Config, T5ForConditionalGeneration, T5Tokenizer),
                 'codet5': (T5Config, T5ForConditionalGeneration, RobertaTokenizer),
                 'bart': (BartConfig, BartForConditionalGeneration, BartTokenizer)}

cpu_cont = multiprocessing.cpu_count()

logging.basicConfig(format='%(asctime)s - %(levelname)s - %(name)s -   %(message)s',
                    datefmt='%m/%d/%Y %H:%M:%S',
                    level=logging.INFO)
logger = logging.getLogger(__name__)


def get_example(item):
    url1, url2, label, tokenizer, args, cache, url_to_code = item
    if url1 in cache:
        code1=cache[url1].copy()
    else:
        try:
            code=' '.join(url_to_code[url1].split())
        except:
            code=""
        code1=tokenizer.tokenize(code)
    if url2 in cache:
        code2=cache[url2].copy()
    else:
        try:
            code=' '.join(url_to_code[url2].split())
        except:
            code=""
        code2=tokenizer.tokenize(code)
    return convert_examples_to_features(code1,code2,label,url1,url2,tokenizer,args,cache)

class InputFeatures(object):
    def __init__(self, input_tokens, input_ids, label, url1, url2):
        self.input_tokens = input_tokens
        self.input_ids = input_ids
        self.label = label
        self.url1 = url1
        self.url2 = url2

def convert_examples_to_features(code1_tokens, code2_tokens, label, url1, url2, tokenizer, args, cache):
    code1_tokens = code1_tokens[:args.block_size - 2]
    code1_tokens = [tokenizer.cls_token] + code1_tokens + [tokenizer.sep_token]
    code2_tokens = code2_tokens[:args.block_size - 2]
    code2_tokens = [tokenizer.cls_token] + code2_tokens + [tokenizer.sep_token]

    code1_ids = tokenizer.convert_tokens_to_ids(code1_tokens)
    padding_length = args.block_size - len(code1_ids)
    code1_ids += [tokenizer.pad_token_id] * padding_length

    code2_ids = tokenizer.convert_tokens_to_ids(code2_tokens)
    padding_length = args.block_size - len(code2_ids)
    code2_ids += [tokenizer.pad_token_id] * padding_length

    source_tokens = code1_tokens + code2_tokens
    source_ids = code1_ids + code2_ids
    return InputFeatures(source_tokens, source_ids, label, url1, url2)

class TextDataset(Dataset):
    def __init__(self, tokenizer, args, file_path='train', block_size=512, pool=None):
        postfix = file_path.split('/')[-1].split('.txt')[0]

        self.examples = []
        self.args = args
        index_filename = file_path

        #load index
        logger.info("Creating features from index file at %s ", index_filename)
        url_to_code = {}

        folder = '/'.join(file_path.split('/')[:-1])
        cache_file_path = os.path.join(folder, '{}_cached_{}'.format(self.args.model_name, postfix))
        code_pairs_file_path = os.path.join(folder, '{}_cached_{}.pkl'.format(self.args.model_name, postfix))
        code_pairs = []
        try:
            self.examples = torch.load(cache_file_path)
            with open(code_pairs_file_path, 'rb') as f:
                code_pairs = pickle.load(f)
            logger.info("Loading features from cached file %s", cache_file_path)

        except:
            logger.info("Creating features from dataset file at %s", file_path)
            with open('/'.join(index_filename.split('/')[:-1]) + '/data.jsonl') as f:
                for line in f:
                    line = line.strip()
                    js = json.loads(line)
                    url_to_code[js['idx']] = js['func']

            data = []
            cache = {}
            with open(index_filename) as f:
                for line in f:
                    line = line.strip()
                    url1, url2, label = line.split('\t')
                    if url1 not in url_to_code or url2 not in url_to_code:
                        continue
                    if label == '0':
                        label = 0
                    else:
                        label = 1
                    data.append((url1, url2, label, tokenizer, args, cache, url_to_code))
            for sing_example in data:
                code_pairs.append([sing_example[0],
                                   sing_example[1],
                                   url_to_code[sing_example[0]],
                                   url_to_code[sing_example[1]]])
            with open(code_pairs_file_path, 'wb') as f:
                pickle.dump(code_pairs, f)

            self.examples=[get_example(x) for x in tqdm(data,total=len(data))]
            torch.save(self.examples, cache_file_path)
            if 'train' in postfix:
                for idx, example in enumerate(self.examples[:3]):
                    logger.info("*** Example ***")
                    logger.info("idx: {}".format(idx))
                    logger.info("label: {}".format(example.label))
                    logger.info("input_tokens: {}".format([x.replace('\u0120', '_') for x in example.input_tokens]))
                    logger.info("input_ids: {}".format(' '.join(map(str, example.input_ids))))

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, item):

        return torch.tensor(self.examples[item].input_ids), torch.tensor(self.examples[item].label)


class EnhancedTextDataset(Dataset):
    def __init__(self, tokenizer, args):
        file_path = '../../../dataset/Clone-detection/test_sampled.txt'

        self.examples = []
        self.args = args
        index_filename = file_path

        logger.info("************ Creating enhancing features from index file ************")
        url_to_code = {}

        logger.info("Creating features from dataset file at %s", file_path)
        with open('/'.join(index_filename.split('/')[:-1]) + '/data.jsonl') as f:
            for line in f:
                line = line.strip()
                js = json.loads(line)
                url_to_code[js['idx']] = js['func']

        url_to_code_tmp = []
        with open(file_path) as f:
            for line in f:
                line = line.strip()
                url1, url2, label = line.split('\t')
                url_to_code_tmp.append((url1, url2, label))
        
        with open(f'/home/yanmeng/huangli/Attack/CodeT5/Clone-detection/code/halfdata/attack_{args.criterion}_first_2000.jsonl') as f:
            for line in f:
                line = line.strip()
                js = json.loads(line)
                if js["Adversarial Code"] == "" or js["Adversarial Code"] == None:
                    continue
                code1 = ' '.join(js["Adversarial Code"].split())
                code1 = tokenizer.tokenize(code1)
                code2 = ' '.join(url_to_code[url_to_code_tmp[js["Index"]][1]].split())
                code2 = tokenizer.tokenize(code2)
                label = url_to_code_tmp[js["Index"]][2]
                if label == '0':
                    label = 0
                else:
                    label = 1
                self.examples.append(convert_examples_to_features(code1, code2, label, None, None, tokenizer, args, None))

    def __len__(self):
        return len(self.examples)

    def __getitem__(self, item):

        return torch.tensor(self.examples[item].input_ids), torch.tensor(self.examples[item].label)


def set_seed(seed=42):
    random.seed(seed)
    os.environ['PYHTONHASHSEED'] = str(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed(seed)
    torch.backends.cudnn.deterministic = True

def train(args, train_dataset, model, tokenizer):
    """ Train the model """
    
    #build dataloader
    train_sampler = RandomSampler(train_dataset) if args.local_rank == -1 else DistributedSampler(train_dataset)
    train_dataloader = DataLoader(train_dataset, sampler=train_sampler, batch_size=args.train_batch_size,num_workers=4)
    
    args.max_steps=args.epochs*len( train_dataloader)
    args.save_steps=len(train_dataloader)
    args.warmup_steps=args.max_steps//5
    model.to(args.device)
    
    # Prepare optimizer and schedule (linear warmup and decay)
    no_decay = ['bias', 'LayerNorm.weight']
    optimizer_grouped_parameters = [
        {'params': [p for n, p in model.named_parameters() if not any(nd in n for nd in no_decay)],
         'weight_decay': args.weight_decay},
        {'params': [p for n, p in model.named_parameters() if any(nd in n for nd in no_decay)], 'weight_decay': 0.0}
    ]
    optimizer = AdamW(optimizer_grouped_parameters, lr=args.learning_rate, eps=args.adam_epsilon)
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=args.warmup_steps,
                                                num_training_steps=args.max_steps)

    # multi-gpu training
    if args.n_gpu > 1:
        model = torch.nn.DataParallel(model)

    # Train!
    logger.info("***** Running training *****")
    logger.info("  Num examples = %d", len(train_dataset))
    logger.info("  Num Epochs = %d", args.epochs)
    logger.info("  Instantaneous batch size per GPU = %d", args.train_batch_size//max(args.n_gpu, 1))
    logger.info("  Total train batch size = %d",args.train_batch_size*args.gradient_accumulation_steps)
    logger.info("  Gradient Accumulation steps = %d", args.gradient_accumulation_steps)
    logger.info("  Total optimization steps = %d", args.max_steps)
    
    global_step=0
    tr_loss, logging_loss,avg_loss,tr_nb,tr_num,train_loss = 0.0, 0.0,0.0,0,0,0
    best_f1=0

    model.zero_grad()
 
    for idx in range(args.epochs): 
        bar = tqdm(train_dataloader,total=len(train_dataloader))
        tr_num=0
        train_loss=0
        for step, batch in enumerate(bar):
            inputs = batch[0].to(args.device)
            labels = batch[1].to(args.device)
            model.train()
            loss, logits = model(inputs, labels)
            
            if args.n_gpu > 1:
                loss = loss.mean()
                
            if args.gradient_accumulation_steps > 1:
                loss = loss / args.gradient_accumulation_steps

            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), args.max_grad_norm)

            tr_loss += loss.item()
            tr_num+=1
            train_loss+=loss.item()
            if avg_loss==0:
                avg_loss=tr_loss
                
            avg_loss=round(train_loss/tr_num,5)
            bar.set_description("epoch {} loss {}".format(idx,avg_loss))
              
            if (step + 1) % args.gradient_accumulation_steps == 0:
                optimizer.step()
                optimizer.zero_grad()
                scheduler.step()  
                global_step += 1
                output_flag=True
                avg_loss=round(np.exp((tr_loss - logging_loss) /(global_step- tr_nb)),4)

                if global_step % args.save_steps == 0:
                    results = evaluate(args, model, tokenizer, eval_when_training=True)    
                    
                    # Save model checkpoint
                    if results['eval_f1']>best_f1:
                        best_f1=results['eval_f1']
                        logger.info("  "+"*"*20)  
                        logger.info("  Best f1:%s",round(best_f1,4))
                        logger.info("  "+"*"*20)                          
                        
                        checkpoint_prefix = 'checkpoint-best-f1'
                        output_dir = os.path.join(args.output_dir, '{}'.format(checkpoint_prefix))                        
                        if not os.path.exists(output_dir):
                            os.makedirs(output_dir)                        
                        model_to_save = model.module if hasattr(model,'module') else model
                        output_dir = os.path.join(output_dir, '{}'.format('model.bin')) 
                        torch.save(model_to_save.state_dict(), output_dir)
                        logger.info("Saving model checkpoint to %s", output_dir)

def evaluate(args, model, tokenizer, eval_when_training=False):
    #build dataloader
    eval_dataset = TextDataset(tokenizer, args, file_path=args.eval_data_file)
    eval_sampler = SequentialSampler(eval_dataset)
    eval_dataloader = DataLoader(eval_dataset, sampler=eval_sampler, batch_size=args.eval_batch_size)

    # multi-gpu evaluate
    if args.n_gpu > 1 and eval_when_training is False:
        model = torch.nn.DataParallel(model)

    # Eval!
    logger.info("***** Running evaluation  *****")
    logger.info("  Num examples = %d", len(eval_dataset))
    logger.info("  Batch size = %d", args.eval_batch_size)

    eval_loss = 0.0
    nb_eval_steps = 0
    model.eval()
    logits = []
    y_trues = []
    for batch in tqdm(eval_dataloader):
        inputs = batch[0].to(args.device)
        labels = batch[1].to(args.device)
        with torch.no_grad():
            lm_loss, logit = model(inputs, labels)
            eval_loss += lm_loss.mean().item()
            logits.append(logit.cpu().numpy())
            y_trues.append(labels.cpu().numpy())
        nb_eval_steps += 1
    logits = np.concatenate(logits, 0)
    y_trues = np.concatenate(y_trues, 0)
    best_threshold = 0.5

    y_preds = logits[:, 1] > best_threshold
    recall = recall_score(y_trues, y_preds, average='macro')
    precision = precision_score(y_trues, y_preds, average='macro')
    f1 = f1_score(y_trues, y_preds, average='macro')
    result = {
        "eval_recall": float(recall),
        "eval_precision": float(precision),
        "eval_f1": float(f1),
        "eval_threshold": best_threshold,
    }

    logger.info("***** Eval results *****")
    for key in sorted(result.keys()):
        logger.info("  %s = %s", key, str(round(result[key],4)))



    return result

def test(args, model, tokenizer, best_threshold=0):
    #build dataloader
    eval_dataset = TextDataset(tokenizer, args, file_path=args.test_data_file)
    eval_sampler = SequentialSampler(eval_dataset) if args.local_rank == -1 else DistributedSampler(eval_dataset)
    eval_dataloader = DataLoader(eval_dataset, sampler=eval_sampler, batch_size=args.eval_batch_size,num_workers=4)

    # multi-gpu evaluate
    if args.n_gpu > 1:
        model = torch.nn.DataParallel(model)

    # Eval!
    logger.info("***** Running Test *****")
    logger.info("  Num examples = %d", len(eval_dataset))
    logger.info("  Batch size = %d", args.eval_batch_size)
    eval_loss = 0.0
    nb_eval_steps = 0
    model.eval()
    logits=[]  
    y_trues=[]
    for batch in tqdm(eval_dataloader):
        inputs = batch[0].to(args.device)
        labels = batch[1].to(args.device)
        with torch.no_grad():
            lm_loss, logit = model(inputs, labels)
            eval_loss += lm_loss.mean().item()
            logits.append(logit.cpu().numpy())
            y_trues.append(labels.cpu().numpy())
        nb_eval_steps += 1
    

    #output result
    logits=np.concatenate(logits,0)
    y_preds=logits[:,1]>best_threshold
    y_trues=np.concatenate(y_trues,0)
    recall=recall_score(y_trues, y_preds, average='macro')
    precision=precision_score(y_trues, y_preds, average='macro')   
    f1=f1_score(y_trues, y_preds, average='macro')             
    result = {
        "test_recall": float(recall),
        "test_precision": float(precision),
        "test_f1": float(f1)
    }

    logger.info("***** Test results *****")
    for key in sorted(result.keys()):
        logger.info("  %s = %s", key, str(round(result[key],4)))

    return result


def main():
    parser = argparse.ArgumentParser()

    ## Required parameters
    parser.add_argument("--train_data_file", default=None, type=str, required=True,
                        help="The input training data file (a text file).")
    parser.add_argument("--output_dir", default=None, type=str, required=True,
                        help="The output directory where the model predictions and checkpoints will be written.")

    ## Other parameters
    parser.add_argument("--eval_data_file", default=None, type=str,
                        help="An optional input evaluation data file to evaluate the perplexity on (a text file).")
    parser.add_argument("--test_data_file", default=None, type=str,
                        help="An optional input evaluation data file to evaluate the perplexity on (a text file).")
                    
    parser.add_argument("--model_name_or_path", default=None, type=str,
                        help="The model checkpoint for weights initialization.")

    parser.add_argument("--config_name", default="", type=str,
                        help="Optional pretrained config name or path if not the same as model_name_or_path")
    parser.add_argument("--tokenizer_name", default="", type=str,
                        help="Optional pretrained tokenizer name or path if not the same as model_name_or_path")
    parser.add_argument("--block_size", default=-1, type=int,
                        help="Optional input sequence length after tokenization."
                             "The training dataset will be truncated in block of this size for training."
                             "Default to the model max input length for single sentence inputs (take into account special tokens).")
    parser.add_argument("--do_train", action='store_true',
                        help="Whether to run training.")
    parser.add_argument("--do_eval", action='store_true',
                        help="Whether to run eval on the dev set.")
    parser.add_argument("--do_test", action='store_true',
                        help="Whether to run eval on the dev set.")    
    parser.add_argument("--evaluate_during_training", action='store_true',
                        help="Run evaluation during training at each logging step.")

    parser.add_argument("--train_batch_size", default=4, type=int,
                        help="Batch size per GPU/CPU for training.")
    parser.add_argument("--eval_batch_size", default=4, type=int,
                        help="Batch size per GPU/CPU for evaluation.")
    parser.add_argument('--gradient_accumulation_steps', type=int, default=1,
                        help="Number of updates steps to accumulate before performing a backward/update pass.")
    parser.add_argument("--learning_rate", default=5e-5, type=float,
                        help="The initial learning rate for Adam.")
    parser.add_argument("--weight_decay", default=0.0, type=float,
                        help="Weight deay if we apply some.")
    parser.add_argument("--adam_epsilon", default=1e-8, type=float,
                        help="Epsilon for Adam optimizer.")
    parser.add_argument("--max_grad_norm", default=1.0, type=float,
                        help="Max gradient norm.")
    parser.add_argument("--max_steps", default=-1, type=int,
                        help="If > 0: set total number of training steps to perform. Override num_train_epochs.")
    parser.add_argument("--warmup_steps", default=0, type=int,
                        help="Linear warmup over warmup_steps.")

    parser.add_argument('--logging_steps', type=int, default=50,
                        help="Log every X updates steps.")
    parser.add_argument('--save_steps', type=int, default=50,
                        help="Save checkpoint every X updates steps.")
    parser.add_argument('--seed', type=int, default=42,
                        help="random seed for initialization")
    parser.add_argument("--local_rank", type=int, default=-1,
                        help="For distributed training: local_rank")
    parser.add_argument('--epochs', type=int, default=1,
                        help="training epochs")
    
    parser.add_argument("--model_name", default="codet5", type=str,
                        help="The name of model which will be attacked.")
    
    parser.add_argument("--use_enhance", action='store_true',
                        help="Whether to use enhanced dataset.")
    parser.add_argument("--criterion", default="bayes", type=str,
                        help="The criterion of attack.")

    args = parser.parse_args()

    # Setup CUDA, GPU
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    args.n_gpu = torch.cuda.device_count()

    args.device = device

    # Setup logging
    logging.basicConfig(format='%(asctime)s - %(levelname)s - %(name)s -   %(message)s',datefmt='%m/%d/%Y %H:%M:%S',level=logging.INFO)
    logger.warning("device: %s, n_gpu: %s",device, args.n_gpu)


    # Set seed
    set_seed(args.seed)
    config = T5Config.from_pretrained(args.config_name if args.config_name else args.model_name_or_path)
    config.num_labels=2
    tokenizer = RobertaTokenizer.from_pretrained(args.tokenizer_name)
    model = T5ForConditionalGeneration.from_pretrained(args.model_name_or_path,config=config)    

    model=Model(model,config,tokenizer,args)
    logger.info("Training/evaluation parameters %s", args)
    # Training
    if args.do_train:
        train_dataset = TextDataset(tokenizer, args, file_path=args.train_data_file)

        if args.use_enhance:
            dataset1 = EnhancedTextDataset(tokenizer, args)
            train_dataset = torch.utils.data.ConcatDataset([train_dataset, dataset1])

            output_dir = '/home/yanmeng/huangli/Attack/CodeT5/Clone-detection/saved_models/checkpoint-best-f1/codet5_model.bin'
            model.load_state_dict(torch.load(output_dir), strict=False)
            logger.info("reload model from {}".format(output_dir))

        train(args, train_dataset, model, tokenizer)

    # Evaluation
    results = {}
    if args.do_eval:
        checkpoint_prefix = 'checkpoint-best-f1/model.bin'
        output_dir = os.path.join(args.output_dir, '{}'.format(checkpoint_prefix))  
        model.load_state_dict(torch.load(output_dir), strict=False)
        model.to(args.device)
        results = evaluate(args, model, tokenizer)
        
    if args.do_test:
        checkpoint_prefix = 'checkpoint-best-f1/model.bin'
        output_dir = os.path.join(args.output_dir, '{}'.format(checkpoint_prefix))  
        model.load_state_dict(torch.load(output_dir), strict=False)
        model.to(args.device)
        results = test(args, model, tokenizer,best_threshold=0.5)

    return results

if __name__ == "__main__":
    main()