---
title: "DevOps 核心理念与实践流程"
date: 2026-06-22T09:00:00+08:00
image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["DevOps", "Obsidian"]
categories: ["6. DevOps"]
slug: "devops-02"
description: "介绍《DevOps 核心理念与实践流程》，涵盖DevOps 介绍、什么是 DevOps和为什么要推广DevOps等实践要点。"
---
# DevOps 介绍

## 什么是 DevOps

DevOps（Development和Operations的组合词）是一组过程、方法与系统的统称，用于促进开发（应用程序和软件工程等）、技术运营和质量保障（QA）部门之间的沟通、协作与整合。它的出现是由于软件行业日益清晰地认识到，为了按时交付软件产品和服务，开发团队和运营团队必须紧密合作。

Dev 需要对开发负责，并且需要应对市场快速的变化、实现业务的需求。Ops 的重心则放在提供安全、可靠、稳定的服务上。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-02/01.png)

## 为什么要推广DevOps

传统架构痛点 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-02/02.png)

DevOps 强调团队协作、相互协助、持续发展，然而传统的模式是开发人员只顾开发程序，运维只负责基础环境管

理和代码部署及监控等，其并不是为了一个共同的目标而共同实现最终的目的，而DevOps 则实现团队作战，即无

论是开发、运维还是测试，都为了最终的代码发布、持续部署和业务稳定而付出各自的努力，从而实现产品设计、

开发、测试和部署的良性循环，实现产品的最终持续交付。

## DevOps 工具链

### DevOps工具：需求管理与缺陷追踪

- Jira
- Zentao 禅道

### DevOps工具：版本管理

- Git 
- GitLab 

### DevOps工具：持续集成  CI

- Jenkins 
- GitLab 

### DevOps工具：持续部署 CD

- Jenkins
- ArgoCD 
- GitLab 

### DevOps工具：构建工具

- Make 
- Maven
- Gradle 

### DevOps工具：代码质量

- SonarQube 

### DevOps工具：运维自动化

- Puppet
- Chef 
- Saltstack 
- Ansible 

### DevOps工具：测试自动化

- Robot Framework
- Selenium

### DevOps工具：日志监控

- ELK / EFK
- Loki 

### DevOps工具：运维监控

- Zabbix 
- Prometheus 

### DevOps工具：安全扫描 

- Clair 镜像扫描  

### DevOps工具：容器化

- Docker
- Kubernetes 

### DevOps工具：镜像仓库 

- Harbor

### DevOps工具：制品库

- Nexus

## CICD

### 持续集成 (CI-Continuous Integration)

持续集成是指多名开发者在开发不同功能代码的过程当中，可以频繁的将代码行合并到一起并且相互不影响工作。

持续集成可以帮助开发人员更加频繁地将代码更改合并到共享分支或主干中。一旦开发人员对应用所做的更改被合并，系统就会通过自动构建应用并运行不同级别的自动化测试（通常是单元测试和集成测试）来验证这些更改，确保更改没有对应用造成破坏。这意味着测试内容涵盖了从类和函数到构成整个应用的不同模块，如果自动化测试发现新代码和现有代码之间有冲突，持续集成可以更加轻松快速地修复这些错误。

### 持续部署 (CD-Continuous Deployment)

持续部署是基于某种工具或平台实现代码自动化的构建、测试和部署到线上环境以实现交付高质量的产品,持续部署在某种程度上代表了一个开发团队的更新迭代速率。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-02/03.png)

## 云原生时代技术架构 

结合 微服务、Kubernetes、DevOps 这三驾马车

Kubernetes 作为容器化编排的常用工具，为容器化实践提供了有效支撑；承载需求的微服务应用程序以容器化的方式实现，使得开发者可以更多地关注于业务开发；DevOps则能保证持续部署与交付能够更顺畅地实施。

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-02/04.png)

## DevOps Roadmap 

![img](https://cdn.jsdelivr.net/gh/luckycloveryh/picgo-bed@main/images/obsidian/devops-02/05.png)
## 来源

- [飞书原文](https://rcnmegz4pby5.feishu.cn/wiki/FMDtwLNgTivg8Mkbx7qcHf7Tnzh)
- 导入日期：2026-06-22