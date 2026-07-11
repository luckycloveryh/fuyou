---
title: "1. 2025-11-6Linux基础阶段"
date: 2025-11-06T09:00:00+08:00
image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
draft: false
tags: ["Linux", "Obsidian"]
categories: ["Linux"]
slug: "linux-01"
description: "从 Obsidian 导入的 Linux 学习笔记"
---
---
操作系统：工具+管理控制硬件
操作系统内核：管理控制硬件
基于Linux内核的发行版


---
不同的磁盘类型对应不同的设备文件名称（Linux中一切皆文件）
创建文件，当系统识别到硬件设备时系统中会出现对应设备的设备文件
硬盘、不同的类型---SCSI、Nvme
SCSI：sda、sdb、sdc
Nvme：Nvme0n1、Nvme0n2、Nvme0n3
光盘：sr（设备文件名），sr0第一个光盘

---
设备文件：字符设备、块设备（硬盘、U盘、光盘）
字符设备：鼠标、键盘
挂载：给设备一个访问入口
挂载点：挂载点原本是系统中存在的一个空目录，将某个块设备文件挂载至空目录后，这个空间目录作为块设备文件的访问入口

---
标准分区：MBR、GPT
LVM：逻辑卷，动态扩容分区空间
分区：boot系统启动分区，内核和系统启动引导文件保存位置（512MB以上）
/boot：根下boot分区，启动分区  /：根
根目录：逻辑上的概念，逻辑上一切硬盘分区都在根目录下
根分区：某个硬盘中某个分区   swap：交换分区，虚拟内存
/分区：系统中绝大多数文件保存的位置

---
root用户：系统中权限最高用户
管理员用户：介于root与普通用户之间
普通用户：系统中权限较低用户
