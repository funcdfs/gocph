package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: AtCoder - AtCoder Beginner Contest 381 C - 11/22 Substring
// URL: https://atcoder.jp/contests/abc381/tasks/abc381_c
// Time: 2026-02-10 14:50:03

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
8
211/2212
`, `
5
`),
		// case 2
		C(`
5
22/11
`, `
1
`),
		// case 3
		C(`
22
/1211/2///2111/2222/11
`, `
7
`),
	}, main)
}

/*

# 简化后通俗题目
给定一个只由 `1`、`2`、`/` 组成的字符串 `S`，长度为 `N`，且字符串里至少有一个 `/`。

我们先定义**符合要求的字符串**，必须同时满足4个条件：
1. 长度是**奇数**
2. 正中间的字符是 `/`
3. 中间 `/` 左边的所有字符全是 `1`
4. 中间 `/` 右边的所有字符全是 `2`

举例：
- 符合要求：`/`、`1/2`、`11/22`、`111/222`
- 不符合：`1122`、`1/22`、`11/2222` 等

请你找出 `S` 的**所有连续子串**中，是「符合要求的字符串」的**最长长度**，并输出这个长度。

---

## 输入
一行：整数 N 和字符串 S

## 输出
符合条件的最长子串长度

*/
