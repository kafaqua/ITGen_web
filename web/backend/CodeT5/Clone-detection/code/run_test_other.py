import os


c = "bayes"

criterions = ["alert", "beam","bayes"]

half_full = "last"

for criterion in criterions:
    if criterion != c:
        half_full = "full"
    else:
        half_full = "last"
    os.system(f"CUDA_VISIBLE_DEVICES=1 python test_other.py \
            --output_dir=../enhanced_models/{c} \
            --model_type=codet5 \
            --config_name=/home/yanmeng/huangli/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
            --tokenizer_name=/home/yanmeng/huangli/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
            --model_name_or_path=/home/yanmeng/huangli/.cache/huggingface/hub/models--Salesforce--codet5-base-multi-sum \
            --eval_data_file=../../../dataset/Clone-detection/test_sampled.txt \
            --last_file=/home/yanmeng/huangli/Attack/CodeT5/Clone-detection/code/halfdata/attack_{criterion}_{half_full}.jsonl \
            --block_size 512 \
            --eval_batch_size 2 \
            --seed 123456")