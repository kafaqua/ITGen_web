import os

os.system('''CUDA_VISIBLE_DEVICES=0 python attack_rnns.py \
    --output_dir=../saved_models/ \
    --model_type=codet5 \
    --config_name=/home/hl/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
    --model_name_or_path=/home/hl/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
    --tokenizer_name=/home/hl/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
    --base_model=/home/hl/.cache/huggingface/hub/models--microsoft--codebert-base-mlm \
    --max_distance=0.15 \
    --max_length_diff=4 \
    --substitutes_size=60  \
    --iters=6 \
    --a=0.2 \
    --csv_store_path result/attack_rnns_all.jsonl \
    --eval_data_file=../../../dataset/Clone-detection/test_sampled.txt \
    --train_data_file=../../../dataset/Clone-detection/train_sampled.txt \
    --valid_data_file=../../../dataset/Clone-detection/valid_sampled.txt \
    --test_data_file=../../../dataset/Clone-detection/test_sampled.txt \
    --block_size 512 \
    --eval_batch_size 2 \
    --seed 123456''')