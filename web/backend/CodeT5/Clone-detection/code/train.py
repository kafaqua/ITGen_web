import os

criterions = ["bayes",]

for criterion in criterions:
    os.system(f"CUDA_VISIBLE_DEVICES=1 python run.py \
        --output_dir=../enhanced_models/{criterion}/ \
        --config_name=/home/yanmeng/huangli/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
        --model_name_or_path=/home/yanmeng/huangli/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
        --tokenizer_name=/home/yanmeng/huangli/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
        --do_train \
        --train_data_file=../../../dataset/Clone-detection/train_sampled.txt \
        --eval_data_file=../../../dataset/Clone-detection/valid_sampled.txt \
        --test_data_file=../../../dataset/Clone-detection/test_sampled.txt \
        --epoch 2 \
        --block_size 512 \
        --train_batch_size 8 \
        --eval_batch_size 32 \
        --learning_rate 5e-5 \
        --max_grad_norm 1.0 \
        --evaluate_during_training \
        --seed 123456 \
        --use_enhance \
        --criterion {criterion} 2>&1 | tee ../enhanced_models/{criterion}/train.log")
    
    
# base_model /home/yanmeng/huangli/.cache/huggingface/hub/models--microsoft--codebert-base-mlm

