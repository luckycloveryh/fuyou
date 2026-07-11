---
title: "05-Job：运行离线业务"
date: 2026-04-06T17:00:12+08:00
image: "https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260524195206_517_12.jpg"
lastmod: 2026-04-06T17:00:12+08:00
tags: ["Kubernetes", "K8s", "Job", "CronJob", "云原生", "运维"]
categories: ["Kubernetes 实战系列"]
author: "杨红"
description: "深入讲解 Kubernetes 中 Job 和 CronJob 的核心概念、使用场景，以及离线业务的调度策略，适合 K8s 运维入门学习。"
slug: "k8s-job-offline-task"
keywords: ["Kubernetes Job", "K8s 离线任务", "CronJob 定时任务"]
---

1. “离线业务”类型的应用一般不直接服务于外部用户，只对内部用户有意义，比如日志分析、数据建模、视频转码等等，虽然计算量很大，但只会运行一段时间。“离线业务”的特点是必定会退出，不会无期限地运行下去，所以它的调度策略也就与“在线业务”存在很大的不同，需要考虑运行超时、状态检查、失败重试、获取计算结果等管理事项。

   “离线业务”可以分为两种。一种是“临时任务”，跑完就完事了，下次有需求了说一声再重新安排；另一种是“定时任务”，可以按时按点周期运行，不需要过多干预。

   对应到 Kubernetes 里，“临时任务”就是 API 对象 Job，“定时任务”就是 API 对象 CronJob，使用这两个对象你就能够在 Kubernetes 里调度管理任意的离线业务了。

   ## 使用 YAML 描述 Job  

   Job 的 YAML“文件头”部分还是那几个必备字段：  

   - apiVersion 不是 v1，而是 batch/v1。
   - kind 是 Job，这个和对象的名字是一致的。
   - metadata 里仍然要有 name 标记名字，也可以用 labels 添加任意的标签。

   使用以下命令可以生成一下 job 对象模板

   比如用 busybox 创建一个“echo-job”，命令就是这样的：  

   ```Bash
   # 生成 job YAML模板 
   kubectl create job echo-job --image=busybox:latest  --dry-run=client -o yaml
   ```

   会生成一个基本的 YAML 文件，保存之后做点修改，就有了一个 Job 对象：  

   ```YAML
   apiVersion: batch/v1
   kind: Job
   
   metadata:
     name: echo-job
     
   spec:
     template:   # Pod 的模板文件 
       spec:
         restartPolicy: Never
         containers:
         - name: echo-job
           image: busybox:latest
           imagePullPolicy: IfNotPresent
           command: ["/bin/echo"]
           args: ["hello", "world"]      
   ```

   你会注意到 Job 的描述与 Pod 很像，但又有些不一样，主要的区别就在“spec”字段里，多了一个 template 字段，然后又是一个“spec”，显得有点怪。  

   为了辅助你理解，我把 Job 对象重新组织了一下，用不同的颜色来区分字段，这样你就能够很容易看出来，其实这个“echo-job”里并没有太多额外的功能，只是把 Pod 做了个简单的包装：

   ![img](/image/kubernetes/kubernetes-05/01.png)

   不过，因为 Job 业务的特殊性，所以我们还要在 spec 里多加一个字段 restartPolicy，确定 Pod 运行失败时的策略，OnFailure 是失败原地重启容器，而 Never 则是不重启容器，让 Job 去重新调度生成一个新的 Pod。

   ## 创建 Job  

   现在让我们来创建 Job 对象，运行这个简单的离线作业，用的命令还是 kubectl apply：  

   ```Bash
   kubectl apply -f job.yaml
   ```

   创建之后 Kubernetes 就会从 YAML 的模板定义中提取 Pod，在 Job 的控制下运行 Pod，你可以用 kubectl get job、kubectl get pod 来分别查看 Job 和 Pod 的状态：  

   ```Bash
   kubectl get job
   kubectl get pod 
   ```

   ![img](/image/kubernetes/kubernetes-05/02.png)

   显示为 Completed 表示任务完成，而 Job 里也会列出运行成功的作业数量，这里只有一个作业，所以就是 1/1。

   你还可以看到，Pod 被自动关联了一个名字，用的是 Job 的名字（echo-job）再加上一个随机字符串（4w9fj），这当然也是 Job 管理的“功劳”，免去了我们手工定义的麻烦，这样我们就可以使用命令 kubectl logs 来获取 Pod 的运行结果：

   ![img](/image/kubernetes/kubernetes-05/03.png)

   这里列出几个控制离线作业的重要字段，其他更详细的信息可以参考 Job 文档：

   - activeDeadlineSeconds，设置 job 运行的超时时间。
   - backoffLimit，设置 Pod 的失败重试次数。
   - completions，Job 完成需要运行多少个 Pod，默认是 1 个。
   - parallelism，它与 completions 相关，表示允许并发运行的 Pod 数量，避免过多占用资源。

   要注意这 4 个字段是属于 Job 级别的，用来控制模板里的 Pod 对象。  

   下面我再创建一个 Job 对象，名字叫“sleep-job”，它随机睡眠一段时间再退出，模拟运行时间较长的作业。Job 的参数设置成 15 秒超时，最多重试 2 次，总共需要运行完 4 个 Pod，但同一时刻最多并发 2 个 Pod：  

   ```YAML
   apiVersion: batch/v1
   kind: Job
   metadata:
     name: sleep-job
   spec:
     activeDeadlineSeconds: 15
     backoffLimit: 2
     completions: 4
     parallelism: 2
     template:
       spec:
         restartPolicy: OnFailure 
         containers:
         - name: echo-job
           image: busybox:latest
           imagePullPolicy: IfNotPresent
           command: 
             - sh
             - -c
             - sleep $(($RANDOM % 10 + 1)) && echo done
   ```

   使用 kubectl apply 创建 Job 之后，我们可以用 kubectl get pod -w 来实时观察 Pod 的状态，看到 Pod 不断被排队、创建、运行的过程：  

   ```YAML
   kubectl apply -f sleep-job.yaml
   kubectl get pod -w
   ```

   ![img](/image/kubernetes/kubernetes-05/04.png)

   等到 4 个 Pod 都运行完毕，我们再用 kubectl get 来看看 Job 和 Pod 的状态：  

   ![img](/image/kubernetes/kubernetes-05/05.png)

   就会看到 Job 的完成数量如同我们预期的是 4，而 4 个 Pod 也都是完成状态。

   显然，“声明式”的 Job 对象让离线业务的描述变得非常直观，简单的几个字段就可以很好地控制作业的并行度和完成数量，不需要我们去人工监控干预，Kubernetes 把这些都自动化实现了。

   ## 使用 YAML 描述 CronJob  

   使用命令 kubectl create 来创建 CronJob 的样板。

   要注意两点。第一，因为 CronJob 的名字有点长，所以 Kubernetes 提供了简写 cj，这个简写也可以使用命令 kubectl api-resources 看到；第二，CronJob 需要定时运行，所以我们在命令行里还需要指定参数 --schedule。

   ```Bash
   kubectl create cronjob echo-cj --image=busybox:latest --schedule="*/2 * * * *"   --dry-run=client -o yaml 
   ```

   然后我们编辑这个 YAML 样板，生成 CronJob 对象：  

   ```YAML
   apiVersion: batch/v1
   kind: CronJob
   metadata:
     name: echo-cj
   spec:
     schedule: "*/1 * * * *"
     jobTemplate:
       spec:
         template:
           spec:
             restartPolicy: OnFailure
             containers:
             - name: echo-cj
               image: busybox:latest
               imagePullPolicy: IfNotPresent
               command: ["/bin/echo"]
               args: ["hello", "world"]   
   ```

   我们还是重点关注它的 spec 字段，你会发现它居然连续有三个 spec 嵌套层次：  

   - 第一个 spec 是 CronJob 自己的对象规格声明
   - 第二个 spec 从属于“jobTemplate”，它定义了一个 Job 对象。
   - 第三个 spec 从属于“template”，它定义了 Job 里运行的 Pod。

   所以，CronJob 其实是又组合了 Job 而生成的新对象，我还是画了一张图，方便你理解它的“套娃”结构：  

   ![img](/image/kubernetes/kubernetes-05/06.png)

   除了定义 Job 对象的“jobTemplate”字段之外，CronJob 还有一个新字段就是“schedule”，用来定义任务周期运行的规则。它使用的是标准的 Cron 语法，指定分钟、小时、日、月、周，和 Linux 上的 crontab 是一样的。像在这里我就指定每分钟运行一次。

   除了名字不同，CronJob 和 Job 的用法几乎是一样的，使用 kubectl apply 创建 CronJob，使用 kubectl get cj、kubectl get pod 来查看状态：  

   ```Bash
   kubectl apply -f cj-job.yaml
   kubectl get cj
   kubectl get pod 
   ```

   ![img](/image/kubernetes/kubernetes-05/07.png)

   ## 总结 

   Kubernetes 设计哲学：单一职责，组合优于继承  

   通过这种嵌套方式，Kubernetes 里的这些 API 对象就形成了一个“控制链”：CronJob 使用定时规则控制 Job，Job 使用并发数量控制 Pod，Pod 再定义参数控制容器，容器再隔离控制进程，进程最终实现业务功能，链条里的每个环节都各司其职，在 Kubernetes 的统一指挥下完成任务。  

   1. Pod 是 Kubernetes 的最小调度单元，但为了保持它的独立性，不应该向它添加多余的功能。
   2. Kubernetes 为离线业务提供了 Job 和 CronJob 两种 API 对象，分别处理“临时任务”和“定时任务”。
   3. Job 的关键字段是 spec.template，里面定义了用来运行业务的 Pod 模板，其他的重要字段有 completions、parallelism 等
   4. CronJob 的关键字段是 spec.jobTemplate 和 spec.schedule，分别定义了 Job 模板和定时运行的规则
