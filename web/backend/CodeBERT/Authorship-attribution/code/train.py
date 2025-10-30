import os

os.system("python run.py \
    --output_dir ../saved_models/ \
    --model_type roberta \
    --config_name /home/yanmeng/huangli/.cache/huggingface/hub/models--microsoft--codebert-base \
    --model_name_or_path /home/yanmeng/huangli/.cache/huggingface/hub/models--microsoft--codebert-base \
    --tokenizer_name /home/yanmeng/huangli/.cache/huggingface/hub/models--roberta-base \
    --number_labels 66 \
    --do_train \
    --train_data_file /home/yanmeng/huangli/Attack/dataset/Authorship-attribution/train.txt \
    --eval_data_file /home/yanmeng/huangli/Attack/dataset/Authorship-attribution/valid.txt \
    --test_data_file /home/yanmeng/huangli/Attack/dataset/Authorship-attribution/valid.txt \
    --epoch 30 \
    --block_size 512 \
    --train_batch_size 16 \
    --eval_batch_size 32 \
    --learning_rate 5e-5 \
    --max_grad_norm 1.0 \
    --evaluate_during_training \
    --seed 123456 2>&1| tee train.log")



