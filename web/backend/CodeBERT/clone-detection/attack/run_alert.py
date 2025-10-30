import os

os.system("CUDA_VISIBLE_DEVICES=1 python attack_alert.py \
    --output_dir=../saved_models \
    --model_type=roberta \
    --tokenizer_name=/home/hl/.cache/huggingface/hub/models--microsoft--codebert-base \
    --model_name_or_path=/home/hl/.cache/huggingface/hub/models--microsoft--codebert-base \
    --csv_store_path result/attack_alert_all.jsonl \
    --base_model=/home/hl/.cache/huggingface/hub/models--microsoft--codebert-base-mlm \
    --use_ga \
    --eval_data_file=../../../dataset/Clone-detection/test_sampled.txt \
    --block_size 512 \
    --eval_batch_size 2 \
    --seed 123456")

