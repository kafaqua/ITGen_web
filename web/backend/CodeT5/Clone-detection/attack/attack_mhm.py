import torch
import sys
import os
import json
import pickle
import time

sys.path.append('../../../')
sys.path.append('../code')
sys.path.append('../../../python_parser')

import argparse
import warnings
import logging
from model import Model
from utils import Recorder
from run import TextDataset
from utils import get_code_tokens, build_vocab, set_seed
from attacker import MHM_Attacker
import multiprocessing
from run_parser import get_identifiers
from transformers import (RobertaForMaskedLM, T5Config, T5ForConditionalGeneration, RobertaTokenizer)

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
warnings.simplefilter(action='ignore', category=FutureWarning)  # Only report warning

MODEL_CLASSES = {
    'codet5': (T5Config, T5ForConditionalGeneration, RobertaTokenizer)
}

logger = logging.getLogger(__name__)

def get_code_pairs(args):
    file_path = args.eval_data_file
    postfix=file_path.split('/')[-1].split('.txt')[0]
    folder = '/'.join(file_path.split('/')[:-1])
    code_pairs_file_path = os.path.join(folder, '{}_cached_{}.pkl'.format(args.model_name, postfix))
    with open(code_pairs_file_path, 'rb') as f:
        code_pairs = pickle.load(f)
    return code_pairs


def main():
    parser = argparse.ArgumentParser()

    ## Required parameters
    parser.add_argument("--output_dir", default=None, type=str, required=True,
                        help="The output directory where the model predictions and checkpoints will be written.")

    ## Other parameters
    parser.add_argument("--eval_data_file", default=None, type=str,
                        help="An optional input evaluation data file to evaluate the perplexity on (a text file).")
    parser.add_argument("--test_data_file", default=None, type=str,
                        help="An optional input evaluation data file to evaluate the perplexity on (a text file).")

    parser.add_argument("--model_type", default="bert", type=str,
                        help="The model architecture to be fine-tuned.")
    parser.add_argument("--test_type", default="", type=str, )
    parser.add_argument("--model_name_or_path", default=None, type=str,
                        help="The model checkpoint for weights initialization.")

    parser.add_argument("--base_model", default=None, type=str,
                        help="Base Model")
    parser.add_argument("--csv_store_path", default=None, type=str,
                        help="Base Model")

    parser.add_argument("--mlm", action='store_true',
                        help="Train with masked-language modeling loss instead of language modeling.")
    parser.add_argument("--mlm_probability", type=float, default=0.15,
                        help="Ratio of tokens to mask for masked language modeling loss")

    parser.add_argument("--config_name", default="", type=str,
                        help="Optional pretrained config name or path if not the same as model_name_or_path")
    parser.add_argument("--tokenizer_name", default="", type=str,
                        help="Optional pretrained tokenizer name or path if not the same as model_name_or_path")
    parser.add_argument("--block_size", default=-1, type=int,
                        help="Optional input sequence length after tokenization."
                             "The training dataset will be truncated in block of this size for training."
                             "Default to the model max input length for single sentence inputs (take into account special tokens).")
    parser.add_argument("--do_eval", action='store_true',
                        help="Whether to run eval on the dev set.")
    parser.add_argument("--do_test", action='store_true',
                        help="Whether to run eval on the dev set.")
    parser.add_argument("--original", action='store_true',
                        help="Whether to MHM original.")
    parser.add_argument("--eval_batch_size", default=4, type=int,
                        help="Batch size per GPU/CPU for evaluation.")
    parser.add_argument('--seed', type=int, default=42,
                        help="random seed for initialization")
    parser.add_argument("--cache_dir", default="", type=str,
                        help="Optional directory to store the pre-trained models downloaded from s3 (instread of the default one)")
    
    parser.add_argument("--model_name", default="codet5", type=str,
                        help="The name of model which will be attacked.")

    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("device: ", device)
    args.device = device

    # Set seed
    set_seed(args.seed)

    config_class, model_class, tokenizer_class = MODEL_CLASSES[args.model_type]
    config = config_class.from_pretrained(args.config_name if args.config_name else args.model_name_or_path,
                                          cache_dir=args.cache_dir if args.cache_dir else None)
    config.num_labels = 2
    tokenizer = tokenizer_class.from_pretrained(args.tokenizer_name,
                                                do_lower_case=False,
                                                cache_dir=args.cache_dir if args.cache_dir else None)
    if args.block_size <= 0:
        args.block_size = tokenizer.max_len_single_sentence  # Our input block size will be the max possible for the model
    args.block_size = min(args.block_size, tokenizer.max_len_single_sentence)
    if args.model_name_or_path:
        model = model_class.from_pretrained(args.model_name_or_path,
                                            from_tf=bool('.ckpt' in args.model_name_or_path),
                                            config=config,
                                            cache_dir=args.cache_dir if args.cache_dir else None)
    else:
        model = model_class(config)

    model = Model(model, config, tokenizer, args)

    checkpoint_prefix = 'checkpoint-best-f1/%s_model.bin' % args.model_name
    output_dir = os.path.join(args.output_dir, '{}'.format(checkpoint_prefix))
    model.load_state_dict(torch.load(output_dir), strict=False)
    model.to(args.device)
    logger.info("reload model from {}".format(output_dir))

    codebert_mlm = RobertaForMaskedLM.from_pretrained(args.base_model)
    tokenizer_mlm = RobertaTokenizer.from_pretrained(args.base_model)
    codebert_mlm.to(args.device)

    # Load Dataset
    eval_dataset = TextDataset(tokenizer, args, args.eval_data_file)

    ## Load code pairs
    source_codes = get_code_pairs(args)

    subs_path = "../../../dataset/preprocess/test_subs_clone.jsonl"
    generated_substitutions = []
    with open(subs_path) as f:
        for line in f:
            js = json.loads(line.strip())
            generated_substitutions.append(js["substitutes"])
    assert len(source_codes) == len(eval_dataset) == len(generated_substitutions)

    code_tokens = []
    for index, code in enumerate(source_codes):
        code_tokens.append(get_identifiers(code[2], "java")[1])

    id2token, token2id = build_vocab(code_tokens, 5000)
    print("VOCAB BUILT!")
    print("id2token: ", id2token)
    print("token2id: ", token2id)
    
    # recoder = Recorder(args.csv_store_path)
    attacker = MHM_Attacker(args, model, tokenizer, token2id, id2token)

    print("ATTACKER BUILT!")

    adv = {"tokens": [], "raw_tokens": [], "ori_raw": [],
           'ori_tokens': [], "label": [], }
    n_succ = 0.0
    total_cnt = 0
    success_attack = 0
    query_times = 0
    all_start_time = time.time()
    with open(args.csv_store_path, "w") as wf:
        for index, example in enumerate(eval_dataset):
            tmp_save = {"Index":None,"Original Code":None,"Adversarial Code":None,"Program Length":None,"Identifier Num":None,"Replaced Identifiers":None,"Query Times":None,"Time Cost":None,"Type":None}
            print("Index: ", index)
            code_pair = source_codes[index]
            code_2 = code_pair[3]
            code_2 = " ".join(code_2.split())
            words_2 = tokenizer.tokenize(code_2)

            substitutes = generated_substitutions[index]
            first_code = code_pair[2]
            orig_code_tokens = get_code_tokens(first_code)
            ground_truth = example[1].item()
            orig_prob, orig_label = model.get_results([example], args.eval_batch_size)
            orig_prob = orig_prob[0]
            orig_label = orig_label[0]

            if orig_label != ground_truth:
                continue
            identifiers = list(substitutes.keys())
            if len(identifiers) == 0:
                continue
            total_cnt += 1
            example_start_time = time.time()
            # _res = attacker.mcmc_random(example, substitutes, tokenizer, code_pair,
            #                                 _label=ground_truth, _n_candi=30,
            #                                 _max_iter=100, _prob_threshold=1)
            
            _res = attacker.mcmc(example, substitutes, tokenizer, code_pair,
                                            _label=ground_truth, _n_candi=30,
                                            _max_iter=100, _prob_threshold=1)

            example_end_time = (time.time() - example_start_time) / 60
            print("Example time cost: ", round(example_end_time, 2), "min")
            print("ALL examples time cost: ", round((time.time() - all_start_time) / 60, 2), "min")
            print("Query times in this attack: ", model.query - query_times)
            replace_info = ''
            if _res["replace_info"] is not None:
                for key in _res["replace_info"].keys():
                    replace_info += key + ':' + _res["replace_info"][key] + ','

            if _res['succ'] == True:
                success_attack += 1
                # recoder.write(index, first_code, _res['tokens'], len(orig_code_tokens), len(identifiers),
                #             replace_info, model.query - query_times, example_end_time, "MHM")
                tmp_save["Index"] = index
                tmp_save["Original Code"] = code_pair[2]
                tmp_save["Adversarial Code"] = _res['tokens']
                tmp_save["Program Length"] = len(orig_code_tokens)
                tmp_save["Identifier Num"] = len(identifiers)
                tmp_save["Replaced Identifiers"] = replace_info
                tmp_save["Query Times"] = model.query - query_times
                tmp_save["Time Cost"] = example_end_time
                tmp_save["Type"] = "MHM"

            else:
                # recoder.write(index, None, None, len(orig_code_tokens), len(identifiers),
                #             None, model.query - query_times, example_end_time, "0")
                tmp_save["Index"] = index
                tmp_save["Program Length"] = len(orig_code_tokens)
                tmp_save["Identifier Num"] = len(identifiers)
                tmp_save["Query Times"] = model.query - query_times
                tmp_save["Time Cost"] = example_end_time
                tmp_save["Type"] = "0"
            query_times = model.query
            wf.write(json.dumps(tmp_save)+'\n')
            print("Success rate: {}/{} = {}".format(success_attack, total_cnt, 1.0 * success_attack / total_cnt))
    print("Final success rate: {}/{} = {}".format(success_attack, total_cnt, 1.0 * success_attack / total_cnt))


if __name__ == "__main__":
    main()