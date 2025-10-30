import json

def merge_two_json(file1, file2, output):
    with open(file1) as f1, open(file2) as f2, open(output, "w") as f3:
        tmp = {}
        for line in f1:
            js1 = json.loads(line.strip())
            tmp.update({js1["Index"]:js1})
        for line in f2:
            js2 = json.loads(line.strip())
            if js2["Index"] == 1926 and "bayes" in file1:
                continue
            if js2["Index"] > 2000 and "bayes" in file1:
                break
            if js2["Index"] > 1999 and ("wir" in file1 or "beam" in file1 or "alert" in file1):
                break
            if js2["Adversarial Code"]==None:
                json.dump(tmp[js2["Index"]], f3)
                f3.write("\n")
            else:
                json.dump(js2, f3)
                f3.write("\n")

def get_last(file, last_output):
    with open(file) as f, open(last_output, "w") as f2:
        for line in f:
            js = json.loads(line.strip())
            if js["Index"] > 1999 and js["Adversarial Code"] != None:
                json.dump(js, f2)
                f2.write("\n")


def get_full(file, output):
    with open(file) as f, open(output, "w") as f2:
        for line in f:
            js = json.loads(line.strip())
            if js["Adversarial Code"] != None:
                json.dump(js, f2)
                f2.write("\n")


criterion = "bayes"

file1 = f"/home/yanmeng/huangli/Attack/CodeT5/Clone-detection/attack/result/attack_{criterion}_all_2000.jsonl"
file2 = f"/home/yanmeng/huangli/Attack/CodeT5/Clone-detection/attack/result/attack_{criterion}_all.jsonl"
output = f"/home/yanmeng/huangli/Attack/CodeT5/Clone-detection/code/halfdata/attack_{criterion}_first_2000.jsonl"
last_output = f"/home/yanmeng/huangli/Attack/CodeT5/Clone-detection/code/halfdata/attack_{criterion}_last.jsonl"
full_output = f"/home/yanmeng/huangli/Attack/CodeT5/Clone-detection/code/halfdata/attack_{criterion}_full.jsonl"


merge_two_json(file1, file2, output)
get_last(file2, last_output)
get_full(file2, full_output)

        