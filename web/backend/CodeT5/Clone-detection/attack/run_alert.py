import os

os.system(f"CUDA_VISIBLE_DEVICES=2 python attack_alert.py \
        --output_dir=../saved_models \
        --model_type=codet5 \
        --config_name=/home/yanmeng/huangli/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
        --tokenizer_name=/home/yanmeng/huangli/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
        --model_name_or_path=/home/yanmeng/huangli/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
        --use_ga \
        --csv_store_path result/attack_alert_all_2000.jsonl \
        --base_model=/home/yanmeng/huangli/.cache/huggingface/hub/models--microsoft--codebert-base-mlm \
        --eval_data_file=../../../dataset/Clone-detection/test_sampled.txt \
        --block_size 512 \
        --eval_batch_size 2 \
        --seed 123456")