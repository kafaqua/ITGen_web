import os

os.system('''CUDA_VISIBLE_DEVICES=2 python attack_rnns.py \
        --output_dir=../saved_models \
        --model_type=roberta \
        --config_name=/home/hl/.cache/huggingface/hub/models--microsoft--codebert-base \
        --model_name_or_path=/home/hl/.cache/huggingface/hub/models--microsoft--codebert-base \
        --tokenizer_name=/home/hl/.cache/huggingface/hub/models--roberta-base \
        --csv_store_path result/attack_rnns_all.jsonl \
        --max_distance=0.15 \
        --max_length_diff=4 \
        --substitutes_size=60  \
        --iters=6 \
        --a=0.2 \
        --base_model=/home/hl/.cache/huggingface/hub/models--microsoft--codebert-base-mlm \
        --eval_data_file=/data/hl/Attack/dataset/Authorship-attribution/valid.txt \
        --train_data_file=/data/hl/Attack/dataset/Authorship-attribution/train.txt \
        --valid_data_file=/data/hl/Attack/dataset/Authorship-attribution/valid.txt \
        --test_data_file=/data/hl/Attack/dataset/Authorship-attribution/valid.txt \
        --block_size 512 \
        --eval_batch_size 2 \
        --seed 123456 ''')
