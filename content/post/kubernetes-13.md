---
title: "15-底层原理"
date: 2026-04-06T17:55:53+08:00
lastmod: 2026-04-06T17:55:53+08:00
draft: false
image: "https://picsum.photos/seed/fuyou-k8s-underlying-principle/1200/675"
tags: ["Kubernetes", "K8s", "底层原理", "云原生", "运维"]
categories: ["8. Kubernetes"]
author: "杨红"
description: "深入讲解 Kubernetes 的底层原理，包括架构、组件、调度、存储等核心机制，适合 K8s 运维进阶学习。"
slug: "k8s-underlying-principle"
keywords: ["K8s 底层原理", "Kubernetes 架构", "云原生运维"]
---

## 控制面组件工作原理

### [Etcd](https://github.com/etcd-io/etcd/releases)

#### 安装

```Bash
ETCD_VER=v3.5.21

# choose either URL
GITHUB_URL=https://github.com/etcd-io/etcd/releases/download
DOWNLOAD_URL=${GOOGLE_URL}

rm -f /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
rm -rf /tmp/etcd-download-test && mkdir -p /tmp/etcd-download-test

curl -L ${DOWNLOAD_URL}/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz -o /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz
tar xzvf /tmp/etcd-${ETCD_VER}-linux-amd64.tar.gz -C /tmp/etcd-download-test --strip-components=1

/tmp/etcd-download-test/etcd --version
/tmp/etcd-download-test/etcdctl version
```

#### 启动服务 

```Bash
# ./etcd
WARNING: Package "github.com/golang/protobuf/protoc-gen-go/generator" is deprecated.
        A future release of golang/protobuf will delete this package,
        which has long been excluded from the compatibility promise.
```

#### 列出集群成员 

```Bash
# ./etcdctl --endpoints=localhost:2379 member list --write-out=table 
+------------------+---------+---------+-----------------------+-----------------------+------------+
|        ID        | STATUS  |  NAME   |      PEER ADDRS       |     CLIENT ADDRS      | IS LEARNER |
+------------------+---------+---------+-----------------------+-----------------------+------------+
| 8e9e05c52164694d | started | default | http://localhost:2380 | http://localhost:2379 |      false |
+------------------+---------+---------+-----------------------+-----------------------+------------+
```

#### 写入操作

```Bash
# 写入数据
./etcdctl  --endpoints=localhost:2379 put /key1 val1
OK

# 读取数据
./etcdctl  --endpoints=localhost:2379 get /key1 
/key1
val1

# 按 Key 的前缀查询数据
./etcdctl  --endpoints=localhost:2379 get --prefix / 
/key1
val1

# 只显示键值
./etcdctl  --endpoints=localhost:2379 get --prefix / --keys-only 
/key1

# watch key 变化 
./etcdctl  --endpoints=localhost:2379 watch --prefix /
./etcdctl --endpoints=localhost:2379 put /name k1s
./etcdctl --endpoints=localhost:2379 put /name k2s
./etcdctl --endpoints=localhost:2379 put /name k3s
./etcdctl --endpoints=localhost:2379 put /name k4s
./etcdctl --endpoints=localhost:2379 get /name -wjson

./etcdctl --endpoints=localhost:2379 watch --prefix /name --rev 1
PUT
/name
k1s
PUT
/name
k2s
PUT
/name
k3s
PUT
/name
k4s
```

#### 灾备

```Bash
# 声明 环境变量
export  ETCDCTL_API=3 
export  ENDPOINTS=localhost:2379

# 备份     
$ etcdctl --endpoints=${ENDPOINTS} snapshot save /data/etcd_backup_dir/etcd-snapshot.db

# 还原
$ etcdutl --data-dir=/data/etcd/etcd-restore snapshot restore   /data/etcd_backup_dir/etcd-snapshot.db
```

### Kubernetes 数据如何保存在 etcd 中

```Bash
export ETCDCTL_API=3



在pod里面访问

kubectl exec -it etcd-master-01 -n kube-system -- sh



etcdctl --endpoints https://localhost:2379 --cert /etc/kubernetes/pki/etcd/server.crt --key /etc/kubernetes/pki/etcd/server.key  --cacert /etc/kubernetes/pki/etcd/ca.crt  get --keys-only --prefix /

etcdctl --endpoints https://localhost:2379 --cert /etc/kubernetes/pki/etcd/server.crt --key /etc/kubernetes/pki/etcd/server.key  --cacert /etc/kubernetes/pki/etcd/ca.crt  get --keys-only --prefix /registry/pods/default/redis-pv-sts-0

etcdctl --endpoints https://localhost:2379 --cert /etc/kubernetes/pki/etcd/server.crt --key /etc/kubernetes/pki/etcd/server.key  --cacert /etc/kubernetes/pki/etcd/ca.crt get /registry/pods/default/redis-pv-sts-0

etcdctl --endpoints https://localhost:2379 --cert /etc/kubernetes/pki/etcd/server.crt --key /etc/kubernetes/pki/etcd/server.key  --cacert /etc/kubernetes/pki/etcd/ca.crt  get /registry/configmaps/default/info
```

Etcd 备份脚本 

```Bash
#!/bin/bash

ETCDCTL_PATH='/usr/local/bin/etcdctl'
ENDPOINTS='https://192.168.200.153:2379'
ETCD_DATA_DIR="/var/lib/etcd"
BACKUP_DIR="/var/backups/kube_etcd/etcd-$(date +%Y-%m-%d-%H-%M-%S)"
KEEPBACKUPNUMBER='5'
ETCDBACKUPPERIOD='30'
ETCDBACKUPSCIPT='/usr/local/bin/kube-scripts'
ETCDBACKUPHOUR=''

ETCDCTL_CERT="/etc/ssl/etcd/ssl/admin-master1.pem"
ETCDCTL_KEY="/etc/ssl/etcd/ssl/admin-master1-key.pem"
ETCDCTL_CA_FILE="/etc/ssl/etcd/ssl/ca.pem"

[ ! -d $BACKUP_DIR ] && mkdir -p $BACKUP_DIR

export ETCDCTL_API=2;$ETCDCTL_PATH backup --data-dir $ETCD_DATA_DIR --backup-dir $BACKUP_DIR

sleep 3

{
export ETCDCTL_API=3;$ETCDCTL_PATH --endpoints="$ENDPOINTS" snapshot save $BACKUP_DIR/snapshot.db \
                                   --cacert="$ETCDCTL_CA_FILE" \
                                   --cert="$ETCDCTL_CERT" \
                                   --key="$ETCDCTL_KEY"
} > /dev/null 

sleep 3

cd $BACKUP_DIR/../;ls -lt |awk '{if(NR > '$KEEPBACKUPNUMBER'){print "rm -rf "$9}}'|sh

if [[ ! $ETCDBACKUPHOUR ]]; then
  time="*/$ETCDBACKUPPERIOD * * * *"
else
  if [[ 0 == $ETCDBACKUPPERIOD ]];then
    time="* */$ETCDBACKUPHOUR * * *"
  else
    time="*/$ETCDBACKUPPERIOD */$ETCDBACKUPHOUR * * *"
  fi
fi

crontab -l | grep -v '#' > /tmp/file
echo "$time sh $ETCDBACKUPSCIPT/etcd-backup.sh" >> /tmp/file && awk ' !x[$0]++{print > "/tmp/file"}' /tmp/file
crontab /tmp/file
rm -rf /tmp/file
```

### kube-apiserver

### kube-controller-manager

### kube-scheduler

## kubelet 

## CRI     CSI    CNI 介绍 

### CRI

容器运行时接口

### CNI

容器网络接口

### CSI 

容器存储接口

阿里云CSI： https://www.alibabacloud.com/help/zh/ack/ack-managed-and-ack-dedicated/user-guide/csi-overview-1/

## Ref

容器运行时 Containerd 安装与使用: https://mp.weixin.qq.com/s/d44ngzDbW_ublUsw-KrCJQ

CRI 客户端 crictl 命令介绍: https://mp.weixin.qq.com/s/DYHSP8s-3PCUkVF-ierZtg

容器命令行工具 nerdctl: https://mp.weixin.qq.com/s/OIC1M0FYd9IJJEKt2Yi6sQ

Kubernetes 集群备份 - Velero: https://mp.weixin.qq.com/s/7k2Eit-zIb3ZZfWMweSQaQ

MinIO on Kuberntes: https://mp.weixin.qq.com/s/3UzDr3VmNxexED7hoST2sA
