---
title: "06-ConfigMap 和 Secret - 应用配置文件"
date: 2026-04-06T17:08:58+08:00
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195301_533_12.jpg"
lastmod: 2026-04-06T17:08:58+08:00
draft: false
tags: ["Kubernetes", "K8s", "ConfigMap", "Secret", "云原生", "运维"]
categories: ["Kubernetes 实战系列"]
author: "杨红"
description: "深入讲解 Kubernetes 中 ConfigMap 和 Secret 的核心概念、使用场景，以及如何用它们管理应用配置，适合 K8s 运维入门学习。"
slug: "k8s-configmap-secret-config"
keywords: ["Kubernetes ConfigMap", "K8s Secret", "K8s 配置管理"]
---

1. Kubernetes 里专门用来管理配置信息的两种对象：ConfigMap 和 Secret，使用它们来灵活地配置、定制我们的应用。

   ## ConfigMap/Secret  

   首先你要知道，应用程序有很多类别的配置信息，但从数据安全的角度来看可以分成两类：  

   - 一类是明文配置，也就是不保密，可以任意查询修改，比如服务端口、运行参数、文件路径等等。  
   - 另一类则是机密配置，由于涉及敏感信息需要保密，不能随便查看，比如密码、密钥、证书等等。  

   这两类配置信息本质上都是字符串，只是由于安全性的原因，在存放和使用方面有些差异，所以 Kubernetes 也就定义了两个 API 对象，ConfigMap 用来保存明文配置，Secret 用来保存秘密配置  

   ### 什么是 ConfigMap  

   先来看 ConfigMap，我们仍然可以用命令 kubectl create 来创建一个它的 YAML 样板。注意，它有简写名字“cm”，所以命令行里没必要写出它的全称：  

   ```Bash
   kubectl create cm info --dry-run=client -o yaml
   ```

   得到的模板文件大概是这个样子：  

   ```YAML
   apiVersion: v1
   kind: ConfigMap
   metadata:
     creationTimestamp: null
     name: info
   ```

   ConfigMap 的 YAML 和之前我们学过的 Pod、Job 不一样，除了熟悉的“apiVersion”“kind”“metadata”，居然就没有其他的了，最重要的字段“spec”哪里去了？这是因为 ConfigMap 存储的是配置数据，是静态的字符串，并不是容器，所以它们就不需要用“spec”字段来说明运行时的“规格”。

   既然 ConfigMap 要存储数据，我们就需要用另一个含义更明确的字段“data”。

   要生成带有“data”字段的 YAML 样板，你需要在 kubectl create 后面多加一个参数 --from-literal ，表示从字面值生成一些数据：

   ```Bash
   kubectl create cm info --from-literal=k=v --dry-run=client -o yaml  
   ```

   > 注意，因为在 ConfigMap 里的数据都是 Key-Value 结构，所以 --from-literal 参数需要使用 k=v 的形式。  

   把 YAML 样板文件修改一下，再多增添一些 Key-Value，就得到了一个比较完整的 ConfigMap 对象：  

   ```YAML
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: info
   data:
     count: '10'
     debug: 'on'
     path: '/etc/systemd'
     greeting: |
       say hello to kubernetes.
       say hi to the world.    
   ```

   现在就可以使用 kubectl apply 把这个 YAML 交给 Kubernetes，让它创建 ConfigMap 对象了：  

   ```Bash
   kubectl apply -f cm.yaml
   ```

   创建成功后，我们还是可以用 kubectl get、kubectl describe 来查看 ConfigMap 的状态：  

   ```Bash
   kubectl  get cm
   kubectl describe cm info
   ```

   ![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=NGIwYTViYzRkMmI1ZjA2NWQ4N2YwNjVmODFmOWEzYmRfSjU2bmxiTkk0ZFhrMFF1NDI3OVF5MUJCTUJwVUVhMnlfVG9rZW46UG1JcmJZZHFrb3Y0NzF4eExjb2NrQ05tblVoXzE3NzU0NzExMjQ6MTc3NTQ3NDcyNF9WNA)

   ![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=YjBkOGIwOTBmZmFjZjY1NmM0NzYxMmNhNmExOWJkNTBfUDNkSzRBcFRkV1hvSEJqc1VtWUJ2SUNOM2hiNDV3dnNfVG9rZW46Umlvb2JqMFJob1FWZUR4UFZYcWNtckdoblJjXzE3NzU0NzExMjQ6MTc3NTQ3NDcyNF9WNA)

   你可以看到，现在 ConfigMap 的 Key-Value 信息就已经存入了 etcd 数据库，后续就可以被其他 API 对象使用。  

   ### 创建 ConfigMap 

   - 使用字面值创建

   ```Bash
   kubectl create configmap cm-conf --from-literal=debug=on --from-literal=count=10
   ```

   - 从目录创建 

   ```Bash
   kubectl create configmap nginx-config --from-file=nginx-conf
   kubectl  get cm nginx-config 
   kubectl describe  cm nginx-config
   ```

   - 从文件创建 

   ```Bash
   kubectl create configmap nginx-config-2 --from-file=nginx-conf/default.conf
   ```

   ### 什么是 Secret  

   了解了 ConfigMap 对象，我们再来看 Secret 对象就会容易很多，它和 ConfigMap 的结构和用法很类似，不过在 Kubernetes 里 Secret 对象又细分出很多类，比如 :

   Secret 有四种类型：

   - **Service Account Token**  ：用来访问 Kubernetes API，由 Kubernetes 自动创建，并且会自动挂载到 Pod 的 `/run/secrets/kubernetes.io/serviceaccount` 目录中；
   - **Opaque** [oʊˈpeɪk]：base64 编码格式的 Secret，用来存储密码、密钥等； key: value 
   - **kubernetes.io/dockerconfigjson** ：用来存储私有 docker registry 的认证信息。
   - **TLS****（****传输层安全****）**：用于存储 TLS 证书和私钥，以支持加密通信。它可以用于需要TLS证书的场景。 Https 

   对应具体有用途如下：

   - 身份识别的凭证信息  
   - 一般的机密信息（格式由用户自行解释）  
   - 访问私有镜像仓库的认证信息
   - HTTPS 通信的证书和私钥

   我们先创建 Opaque 类型的，创建 YAML 样板的命令是 kubectl create secret generic ，同样，也要使用参数

   ` --from-literal` 给出 Key-Value 值：  

   ```Bash
   kubectl create secret generic user --from-literal=username=root --dry-run=client -o yaml 
   ```

   得到的 Secret 对象大概是这个样子：  

   ```YAML
   apiVersion: v1
   kind: Secret
   metadata:
     name: user
     
   data:
     username: cm9vdA==
   ```

   Secret 对象第一眼的感觉和 ConfigMap 非常相似，只是“kind”字段由“ConfigMap”变成了“Secret”，后面同样也是“data”字段，里面也是 Key-Value 的数据。  

   这串“乱码”就是 Secret 与 ConfigMap 的不同之处，不让用户直接看到原始数据，起到一定的保密作用。不过它的手法非常简单，只是做了 Base64 编码，根本算不上真正的加密，我们可以直接使用 Linux 命令"base64" 来解密 ：  

   ```Bash
   # base64 解码
   [root@k8s cm-sc]# echo "cm9vdA==" | base64 -d 
   root
   # base64 编码 注意要加 -n 参数 
   [root@k8s cm-sc]# echo -n  "mysql" | base64
   bXlzcWw=
   [root@k8s cm-sc]# echo -n  "123456" | base64
   MTIzNDU2
   ```

   我们再来重新编辑 Secret 的 YAML，为它添加两个新的数据，方式可以是参数 `--from-literal `自动编码，也可以是自己手动编码：  

   ```YAML
   apiVersion: v1
   kind: Secret
   metadata:
     name: user
     
   data:
     username: cm9vdA==
     password: MTIzNDU2
     db: bXlzcWw=
   ```

   使用 kubectl apply、kubectl get、kubectl describe 创建和查看对象：  

   ```Bash
   kubectl apply -f secret.yaml
   kubectl  get secrets
   kubectl describe secrets user
   ```

   ![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=YzJlYmMzZjAzZjVjMzliYTY4ZGE5M2I2NzQ5YmNiZTNfWU9BVTVoeG9meEFuTk9HVGVVR2NkZ0ZHOFgzNzdmNUdfVG9rZW46SWt3Q2JSRTlEb3FnREJ4Y3FzRWM2NEphbkRkXzE3NzU0NzExMjQ6MTc3NTQ3NDcyNF9WNA)

   ![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=Y2JmNTBjYWJiNmVmYWViYzg2ODkxMjFkNjk5MDM4MWVfWGYwcEk1bHRLaXNuZW5TdnluY1Nzb3lNenFzMHg3QXdfVG9rZW46VnkwWGJXcnAxb3hWakt4aWx2T2NaUHcybmRoXzE3NzU0NzExMjQ6MTc3NTQ3NDcyNF9WNA)

   这样一个存储敏感信息的 Secret 对象也就创建好了，而且因为它是保密的，使用 kubectl describe 不能直接看到内容，只能看到数据的大小，你可以和 ConfigMap 对比一下。  

   ### 创建Secret

   - docker registry 认证的 secret

   ```Bash
   kubectl create secret docker-registry my-registry-secret --docker-server=reg.xxhf.cc --docker-username=admin --docker-password=password --docker-email=chijj@xxhf.cn
   apiVersion: v1
   kind: Pod
   metadata:
     name: foo
   spec:
     imagePullSecrets:        # 镜像拉取 secret
       - name: myregistrykey  # secret-name
     containers:
       - name: foo
         image: reg.xinxianghf/lib/myapp:v1
   ```

   - TLS secret 

   ## 如何使用

   通过编写 YAML 文件，我们创建了 ConfigMap 和 Secret 对象，该怎么在 Kubernetes 里应用它们呢？

   因为 ConfigMap 和 Secret 只是一些存储在 etcd 里的字符串，所以如果想要在运行时产生效果，就必须要以某种方式“注入”到 Pod 里，让应用去读取。在这方面的处理上 Kubernetes 和Docker 是一样的，也是两种途径：环境变量和加载文件。

   先看比较简单的环境变量。

   ### 以环境变量的方式

   “valueFrom”字段指定了环境变量值的来源，可以是“configMapKeyRef”或者“secretKeyRef”，然后你要再进一步指定应用的 ConfigMap/Secret 的“name”和它里面的“key”。

   由于“valueFrom”字段在 YAML 里的嵌套层次比较深，初次使用最好看一下 kubectl explain 对它的说明：

   ```Bash
   kubectl explain pod.spec.containers.env.valueFrom
   ```

   下面是 引用了 ConfigMap 和 Secret 对象的 Pod 定义

   ```YAML
   apiVersion: v1
   kind: Pod
   metadata:
     name: env-pod
     labels:
       owner: xxhf
       env: dev
   spec:
     containers:
     - name: busy
       image: busybox:latest 
       imagePullPolicy: IfNotPresent
       command: ["/bin/sleep", "3000"]
       env:
         - name: COUNT   # 环境变量名字
           valueFrom:
             configMapKeyRef:
               name: info   # configmap 名字
               key: count   # info configmap 中定义 count key
         - name: DEBUG 
           valueFrom:
             configMapKeyRef:
               name: info
               key: debug 
         - name: USERNAME 
           valueFrom:
             secretKeyRef:
               name: user   # secret 名字
               key: username    # user secset 中的 username key 
         - name: PASSWORD 
           valueFrom:
             secretKeyRef:
               name: user 
               key: password 
   ```

   用 kubectl apply 创建 Pod，再用 kubectl exec 进入 Pod，验证环境变量是否生效：

   ```Bash
   kubectl apply -f env-pod.yaml
   kubectl exec -it env-pod  -- sh
   
   echo $COUNT
   echo $DEBUG
   echo $USERNAME
   echo $PASSWORD
   ```

   ![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=MWE5YTlkMDY5ZTQ5YTI5NzRjMzQ5MTc0ZjJmZGYwOTlfNFRDUDlXdk53RmRLTUc4OXY4Tkh2SW9QWXNXa2VoTk9fVG9rZW46QUVLQ2JYa2NMb3RGSkh4dEk4TmNia3dUbnJiXzE3NzU0NzExMjQ6MTc3NTQ3NDcyNF9WNA)

   这张截图就显示了 Pod 的运行结果，可以看到在 Pod 里使用 echo 命令确实输出了我们在两个 YAML 里定义的配置信息，也就证明 Pod 对象成功组合了 ConfigMap 和 Secret 对象。

   以环境变量的方式使用 ConfigMap/Secret 还是比较简单的，下面来看第二种加载文件的方式。

   ### 以 Volume 的方式   

   Kubernetes 为 Pod 定义了一个“Volume”的概念，可以翻译成是“存储卷”。如果把 Pod 理解成是一个虚拟机，那么 Volume 就相当于是虚拟机里的磁盘。

   > 注意： Volume 属于 Pod，不属于容器，所以它和字段“containers”是同级的，都属于“spec”。

   下面让我们来定义两个 Volume，分别引用 ConfigMap 和 Secret，名字是 cm-vol 和 sec-vol：

   ```YAML
   spec:
     volumes:
     - name: cm-vol  # 卷名字
       configMap:
         name: info
     - name: sec-vol
       secret:
         secretName: user
   ```

   使用 “volumeMounts”字段来挂载卷，可以把定义好的 Volume 挂载到容器里的某个路径下，所以需要在里面用“mountPath” “name”明确地指定挂载路径和 Volume 的名字。  

   ```YAML
     containers:
     - name: busy
       image: busybox:latest 
       imagePullPolicy: IfNotPresent
       command: ["/bin/sleep", "3000"]
       volumeMounts:
       - mountPath: /tmp/configmap   # 挂载点 
         name: cm-vol                # volume 的名字 
       - mountPath: /tmp/secret
         name: sec-vol
   ```

   把“volumes”和“volumeMounts”字段都写好之后，配置信息就可以加载成文件了。

   下面是 Pod 的完整 YAML 描述，然后使用 kubectl apply 创建它.

   ```YAML
   apiVersion: v1
   kind: Pod
   metadata:
     name: env-pod
     labels:
       owner: xxhf
       env: dev
   spec:
     volumes:
     - name: cm-vol
       configMap:
         name: info
     - name: sec-vol
       secret:
         secretName: user
     containers:
     - name: busy
       image: busybox:latest 
       imagePullPolicy: IfNotPresent
       command: ["/bin/sleep", "3000"]
       volumeMounts:
       - mountPath: /tmp/configmap
         name: cm-vol
       - mountPath: /tmp/secret
         name: sec-vol
   ```

   创建之后，我们还是用 kubectl exec 进入 Pod，看看配置信息被加载成了什么形式：  

   ```YAML
   kubectl apply -f vol-pod.yaml
   kubectl  get pod
   kubectl exec -it env-pod  -- sh 
   ```

   ![img](https://rcnmegz4pby5.feishu.cn/space/api/box/stream/download/asynccode/?code=ODVhZTM0ZDFjNGM0NzJjOWM1MjBiZTVmNTE3OTk0MWJfZzdMV1YyVlo4ZlhYV2w2RE13dHFVTUFJaFVnakprM0VfVG9rZW46UG5kcmIwVVBNb1BrRk14YUpmV2NUQTJvblFiXzE3NzU0NzExMjQ6MTc3NTQ3NDcyNF9WNA)

   ConfigMap 和 Secret 都变成了目录的形式，而它们里面的 Key-Value 变成了一个个的文件，而文件名就是 Key。

   因为这种形式上的差异，以 Volume 的方式来使用 ConfigMap/Secret，就和环境变量不太一样。

   环境变量用法简单，更适合存放简短的字符串，而 Volume 更适合存放大数据量的配置文件，在 Pod 里加载成文件后让应用直接读取使用。

   ## 如果配置文件发生变化，Pod 中加载的数据是否会同步更新 ？ 热更新 

   - 以环境变量方式挂载   不支持热更新  
   - 以 volume 方式 挂载   支持热更新  

   ## 总结 

   Kubernetes 里管理配置信息的 API 对象 ConfigMap 和 Secret，它们分别代表了明文信息和机密敏感信息，存储在 etcd 里，在需要的时候可以注入Pod 供 Pod 使用。

   1. ConfigMap 记录了一些 Key-Value 格式的字符串数据，描述字段是“data”，不是“spec”。
   2. Secret 与 ConfigMap 很类似，也使用“data”保存字符串数据，但它要求数据必须是 Base64 编码，起到一定的保密效果。  
   3. 在 Pod 的 “env.valueFrom” 字段中可以引用 ConfigMap 和 Secret，把它们变成应用可以访 问的环境变量。
   4. 在 Pod 的 “spec.volumes” 字段中可以引用 ConfigMap 和 Secret，把它们变成存储卷，然后 在 “spec.containers.volumeMounts” 字段中加载成文件的形式。
   5. ConfigMap 和 Secret 对存储数据的大小没有限制，但小数据用环境变量比较适合，大数据 应该用存储卷，可根据具体场景灵活应用。 1MB  etcd 
