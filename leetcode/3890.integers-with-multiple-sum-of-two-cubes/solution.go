// Created by funcdfs at 2026/04/09 17:32
// leetgo: 1.4.17
// https://leetcode.cn/problems/integers-with-multiple-sum-of-two-cubes/

/*
3890. 可由多种立方和构造的整数 (Medium)
给你一个整数 `n`。

当存在 **至少** 两组不同的整数对 `(a, b)` 满足以下条件时，整数 `x` 被称为 **好整数**：

- `a` 和 `b` 是正整数。
- `a <= b`
- `x = a³ + b³`

返回一个数组，其中包含所有小于等于 `n` 的好整数，并按升序排序。

**示例 1：**

**输入：** n = 4104

**输出：**\[1729,4104\]

**解释：**

在小于等于 4104 的整数中，好整数包括：

- 1729： `1³ + 12³ = 1729`，以及 `9³ + 10³ = 1729`。
- 4104： `2³ + 16³ = 4104`，以及 `9³ + 15³ = 4104`。

因此，答案是 `[1729, 4104]`。

**示例 2：**

**输入：** n = 578

**输出：**\[\]

**解释：**

不存在小于等于 578 的好整数，因此答案是空数组。

**提示：**

- `1 <= n <= 10⁹`

*/

package main

import (
	"bufio"
	"fmt"
	"os"
	"sort"

	. "github.com/j178/leetgo/testutils/go"
)

// @lc code=begin

func findGoodIntegers(n int) (ans []int) {
	// store all cubes <= n into a set
	cubeSet := make(map[int]bool)
	cubes := []int{}
	for i := 1; i*i*i <= n; i++ {
		cubes = append(cubes, i*i*i)
		cubeSet[i*i*i] = true
	}

	// for each aim = a³+b³, two-sum: check if aim-c is also a cube
	cnt := make(map[int]int)
	for _, c := range cubes {
		for _, c2 := range cubes {
			if c2 < c {
				continue
			}
			aim := c + c2
			if aim > n {
				break
			}
			cnt[aim]++
		}
	}

	for x, c := range cnt {
		if c >= 2 {
			ans = append(ans, x)
		}
	}
	sort.Ints(ans)
	return
}

// @lc code=end

func main() {
	stdin := bufio.NewReader(os.Stdin)
	n := Deserialize[int](ReadLine(stdin))
	ans := findGoodIntegers(n)

	fmt.Println("\noutput:", Serialize(ans))
}
