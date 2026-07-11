---
title: "Sonar 代码质量平台部署"
date: 2026-06-22T09:00:00+08:00
image: "https://picsum.photos/seed/fuyou-devops-09/1200/600"
draft: false
tags: ["DevOps", "Obsidian"]
categories: ["6. DevOps"]
slug: "devops-09"
description: "从 Obsidian 导入的 DevOps 学习笔记"
---
# Sonar

Jenkins 与 Sonar 集成  

## Sonar 安装 

为避免容器删除后数据丢失，我们在本地创建需要持久化的目录。具体而言，需要创建conf、extensions、logs、data目录，将其挂载到Docker容器中，以完成SonarQube服务的启动及数据的持久化，命令如下。

```Bash
mkdir -p /data/devops/sonarqube/{sonarqube_conf,sonarqube_extensions}
mkdir -p /data/devops/sonarqube/{sonarqube_logs,sonarqube_data}
```

在启动容器时，通过Docker命令行工具中的-v参数，将本地目录与容器内的数据目录挂载起来，这样可以将SonarQube 的数据持久化到本地磁盘，以防止容器删除后数据丢失。命令如下。

```Bash
docker run -itd  --name sonarqube \
-p 9000:9000 \
--restart=always \
-v /data/devops/sonarqube/sonarqube_conf:/opt/sonarqube/conf \
-v /data/devops/sonarqube/sonarqube_extensions:/opt/sonarqube_extensions \
-v /data/devops/sonarqube/sonarqube_logs:/opt/sonarqube/logs \
-v /data/devops/sonarqube/sonarqube_data:/opt/sonarqube/data \
sonarqube:lts-community
```

访问` http://主机IP:9000 `进入SonarQube页面。自8.x.x版本开始，SonarQube加强了安全设置，需要验证后才能进入系统。默认账号为admin，密码为admin。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/01.png)

首次登录需要更新密码

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/02.png)

SonarQube平台支持与DevOps平台集成。创建SonarQube项目的方式有很多种，例如可以配置From GitLab导入已存在的项目，还可以使用Manually的方式手动创建项目。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/03.png)

## 插件管理 

SonarQube可以通过插件来扩展功能，但SonarQube官方并不提供插件。因此，安装风险由用户自行承担。SonarQube官方对安装和使用的插件不承担任何责任。用户可以在单击I understand the risk按钮确认风险后直接从下面的列表中安装插件，如下图所示。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/04.png)

搜索要安装的插件，这里我们可以选择安装Chinese Pack（中文插件）来将页面从英文模式变成中文模式。单击Install按钮进行安装即可。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/05.png)

安装插件的第一步是将插件下载到SonarQube的插件目录中。进入容器可以找到插件的下载目录。

插件下载成功后服务器页面会提示需要重启服务。单击 `Restart Server` 按钮完成服务重启。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/06.png)

重启服务后，页面从英文模式变成了中文模式。

## SonarQube代码扫描

SonarQube最多可以分析29种不同的语言，具体取决于软件的版本，分析的内容会因语言而异。在所有语言上，都对源代码进行静态分析。对于某些语言，静态分析应该在编译后的代码上完成，如Java中的.class文件和C#中的.dll文件等。

### SonarQube质量配置

SonarQube中每种编程语言都会有一些内置的代码规则。代码规则是SonarQube对源代码进行分析的基础，它们定义了如何扫描代码并识别潜在的问题。SonarQube进行代码质量检查也是通过这些规则来判断的。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/07.png)

质量配置则定义了如何对这些潜在的问题进行评估，以及如何根据评估结果调整扫描规则。在企业中，每个公司或者组织对质量配置要求定义不一致，可以单击“创建”按钮来创建质量配置以自定义质量标准。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/08.png)

### SonarQube质量阈

质量阈指的是质量门禁，通常作为提交流水线中的质量关卡及项目的质量。质量阈也可以根据公司和组织的侧重点来进行合理设置。在设置质量阈值时，可以定义一个质量度量条件，如代码覆盖率，并将其设置为一个阈值。如果代码中的覆盖率小于该阈值，则质量不合格。这样，就可以对代码质量进行管控。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/09.png)

### Sonar Scanner 配置

SonarQube 平台使用 Sonar Scanner 进行代码扫描。Sonar Scanner 为不同项目构建工具提供了插件，如Maven、Gradle、.NET、Jenkins 等，还提供了命令行工具。一般代码扫描阶段需要和提交流水线集成，所以这里我们重点讲解关于通用的命令行工具和Jenkins插件的使用方式。

```Bash
##下载包
wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-6.1.0.4477.zip

##解压包
unzip sonar-scanner-cli-6.1.0.4477.zip  -d /usr/local/

##设置环境变量
tee -a /etc/profile <<'EOF'
export SONAR_SCANNER_HOME=/usr/local/sonar-scanner-6.1.0.4477/
export PATH=$SONAR_SCANNER_HOME/bin:$PATH
EOF

# 配置 JDK 
tee -a /etc/profile <<'EOF'
export JAVA_HOME=/usr/local/jdk-17.0.9/
export PATH=$JAVA_HOME/bin:$PATH
EOF

## 测试生效
sonar-scanner -v
14:21:15.141 INFO  Scanner configuration file: /usr/local/sonar-scanner-6.1.0.4477/conf/sonar-scanner.properties
14:21:15.145 INFO  Project root configuration file: NONE
14:21:15.166 INFO  SonarScanner CLI 6.1.0.4477
14:21:15.168 INFO  Java 17.0.9 Oracle Corporation (64-bit)
14:21:15.169 INFO  Linux 3.10.0-1160.el7.x86_64 amd64

```

扫描参数配置

Sonar Scanner扫描项目时需要一些项目参数，如项目的关键字、项目名称、项目版本包、代码扫描目录、语言编码、SonarQube服务端信息等，具体如下。

```Bash
#定义唯一的关键字
sonar.projectKey=devops-hello-app

#定义项目名称
sonar.projectName=devops-hello-app

#定义项目的版本信息
sonar.projectVersion=1.0

#指定扫描代码的目录位置（多个目录需要逗号分隔）
sonar.sources=.

#执行项目编码
sonar.sourceEncoding=UTF-8

#指定sonar Server
sonar.host.url=
sonar.login=
sonar.password=
```

参数的传递有两种方式，可以通过写入文件，也可以通过命令行直接传递。默认情况下会加载名称为sonar-project.properties的参数文件。使用方式如下。

```Bash
# 指定配置文件
sonar-scanner -Dproject.settings=myproject.properties

# 命令行传参
sonar-scanner -Dsonar.projectKey=myproject -Dsonar.sources=src
```

### 扫描 java 项目

获取要扫描的应用代码，编译成功后会出现一个target目录，target/classes目录用于存放.class文件。当显示“BUILD SUCCESS”时表示项目构建成功

```Bash
# mvn clean package
......
[INFO] --- maven-jar-plugin:3.4.2:jar (default-jar) @ demo ---
[INFO] Building jar: /var/lib/jenkins/workspace/demo-sonar/target/demo-0.0.1-SNAPSHOT.jar
[INFO] 
[INFO] --- spring-boot-maven-plugin:3.4.0:repackage (repackage) @ demo ---
[INFO] Replacing main artifact /var/lib/jenkins/workspace/demo-sonar/target/demo-0.0.1-SNAPSHOT.jar with repackaged archive, adding nested dependencies in BOOT-INF/.
[INFO] The original artifact has been renamed to /var/lib/jenkins/workspace/demo-sonar/target/demo-0.0.1-SNAPSHOT.jar.original
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  7.969 s
[INFO] Finished at: 2024-11-28T10:41:01+08:00
[INFO] ------------------------------------------------------------------------
```

生成扫描使用的配置文件 `sonar-project.properties`

```Bash
#定义唯一的关键字
sonar.projectKey=simple-java-app

#项目名称
sonar.projectName=simple-java-app

#项目的版本信息
sonar.projectVersion=1.0

#指定扫描代码的目录位置
sonar.sources=src

#执行项目编码
sonar.sourceEncoding=UTF-8

#指定sonar Server
sonar.host.url=http://192.168.11.35:9000
#认证信息
sonar.login=admin
sonar.password=XXXXX

#Java class目录
sonar.java.binaries=target/classes
sonar.java.test.binaries=target/test-classes
Sonar.java.surefire.report=target/surefire-reports

```

运行 sonar-scanner 命令可以直接加载配置文件并运行扫描。扫描成功后，本地会出现下面的提示日志

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/10.png)

可以在SonarQube服务器中看到扫描项目的质量信息

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/11.png)

## Jenkins  与 SonarQube 系统集成 

我们使用` ``https://start.spring.io/` 提供的初始化页面创建一个测试的Java 项目，然后使用SonarScanner进行扫描。测试项目是用Java语言编写的，采用的是Spring Boot框架，项目构建工具是 Apache Maven，如下图所示。 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/12.png)

解压下载后的项目，修改` src/main/java/com/example/demo `目录下的 `DemoApplication.java` 源文件，内容如下：

```Java
package com.example.demo;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class DemoApplication {
    public static void main(String[] args) {
      SpringApplication.run(DemoApplication.class, args);
    }
    @GetMapping("/hello")
    public String hello(@RequestParam(value = "name", defaultValue = "World") String name) {
      return String.format("Hello %s!", name);
    }
}
```

在 GitLab 上创建一个项目 `demo-sonar-app`， 并上传我们生成的代码 。 

```Bash
git init --initial-branch=main
git remote add origin http://gitlab.xxhf.cc/devops/demo-sonar-app.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

代码中不应该包含 敏感数据，因为我们需要把 sonar-project.properties 中的 账号和密码的参数删除。 

```Bash
sonar.projectKey=demo-sonar-app

#项目名称
sonar.projectName=demo-sonar-app

#项目的版本信息
sonar.projectVersion=1.0

#指定扫描代码的目录位置
sonar.sources=src

#执行项目编码
sonar.sourceEncoding=UTF-8

#指定sonar Server
sonar.host.url=http://192.168.11.35:9000
#认证信息
#sonar.login=admin
#sonar.password=

#Java class目录
sonar.java.binaries=target/classes
sonar.java.test.binaries=target/test-classes
Sonar.java.surefire.report=target/surefire-reports
```

将SonarQube系统的认证用户信息存储到Jenkins凭据中，凭据 id 为 sonar-user。

### 创建 Pipeline 

在 Jenkins 中新建流水线项目，名称为 demo-sonar-01

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/13.png)

Pipeline 内容如下： 

此 Jenkinsfile 分3个步骤：获取代码、编译打包、代码扫描。

```Bash
pipeline {
    agent any
        
        // 参数
    parameters {
        string(name:'BranchName', defaultValue: 'main')
    }
        
        // 选项
    options { 
            timestamps() 
        } 
        
        // 工具
    tools {
        maven 'maven'
        jdk 'jdk17'
    }
        
        // 环境变量
    environment { 
                project = "sonar"
                appName = "demo-sonar-app"
                repoUrl = "http://gitlab.xxhf.cc/devops/demo-sonar-app.git"               
                GIT_CRED_ID="gitlab-user"
                SONAR_CRED_ID="sonar-user"
    }        

    stages{  
        stage('获取代码') {
                                steps {
                                  echo "starting fetchCode from ${repoUrl}......"
                                  checkout scmGit(
                                        branches: name: "${params.BranchName}",
                                        userRemoteConfigs: credentialsId: "${GIT_CRED_ID}",
                                        url: "${repoUrl}")
                                }
            }
            stage('编译打包') {
                                steps {
                                        sh "mvn clean package"
                                }
            }
            stage('代码扫描') {
                                steps {
                                        withCredentials([usernamePassword(credentialsId: 'sonar-user', passwordVariable: 'PASSWORD', 
                                        usernameVariable: 'USERNAME')]) {
                                                sh "sonar-scanner \
                                                        -Dsonar.login=${USERNAME} \
                                                        -Dsonar.password=${PASSWORD}"
                                        }
                                } 
            }     
    }
}
```

构建成功页面

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/14.png)

登陆 SonarQube 可以看到代码质量扫描结果

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/15.png)

### 使用 [SonarQube Scanner](https://plugins.jenkins.io/sonar/) 插件

安装 插件

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/16.png)

配置 SonarQube servers

Manager Jenkins -> System 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/17.png)

配置 Credentials  

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/18.png)

生成 Sonar token 

登录 SonarQube， 配置 -> 权限 -> 用户

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/19.png)

配置 SonarQube Scanner 

Manager Jenkins -> Tools 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-09/20.png)

配置 Pipeline 

```Bash
pipeline {
    agent any 
        // 参数
    parameters {
        string(name:'BranchName', defaultValue: 'main')
    }
        
        // 选项
    options { 
            timestamps() 
        } 
        
        // 工具
    tools {
        maven 'maven'
        jdk 'jdk17'
    }
        
        // 环境变量
    environment { 
        project = "sonar"
        appName = "demo-sonar-app"
                repoUrl = "http://gitlab.xxhf.cc/devops/demo-sonar-app.git"               
                GIT_CRED_ID="gitlab-user"
                SONAR_CRED_ID="sonar-user"
    }        

    stages {
        stage("Checkout") {
            steps {
                println "starting fetchCode from ${repoUrl}......"
                checkout scmGit(
                                        branches: name: "${params.BranchName}",
                                        userRemoteConfigs: credentialsId: "${GIT_CRED_ID}",
                                        url: "${repoUrl}")
            }
        }

        stage("build && SonarQube analysis") {
            steps{
                withSonarQubeEnv('SonarQube Server') {
                    sh 'mvn clean package sonar:sonar'
                }
            }
        }

        stage("Quality Gate") {
            steps{
                timeout (time: 2, unit: "MINUTES") {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
    }

}
```

## REF

https://docs.sonarsource.com/sonarqube-server/latest/setup-and-upgrade/installation-requirements/database-requirements/

[SonarQube integration with Jenkins](https://docs.sonarsource.com/sonarqube-server/10.6/analyzing-source-code/ci-integration/jenkins-integration/key-features/)
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/TMadwpAqGilNHQk00Lmcaul8nrd)
- 导入日期：2026-06-22