// Created by funcdfs at 2026/04/09 16:59
// leetgo: dev
// https://leetcode.cn/problems/mirror-frequency-distance/

/*
3889. 镜像频次距离 (Medium)
给你一个由小写英文字母和数字组成的字符串 `s`。

对于每个字符，其 **镜像字符** 根据逆序定义其字符集合：

- 对于字母，某字符的镜像字符是字母表中从末尾与其位置相同的字母。
  - 例如， `'a'` 的镜像字符是 `'z'`， `'b'` 的镜像字符是 `'y'`，以此类推。
- 对于数字，某字符的镜像字符是范围 `'0'` 到 `'9'` 中从末尾与其位置相同的数字。

  - 例如， `'0'` 的镜像字符是 `'9'`， `'1'` 的镜像字符是 `'8'`，以此类推。

对于字符串中每个 **唯一** 字符 `c`：

- 设 `m` 为其 **镜像字符** 。
- 设 `freq(x)` 表示字符 `x` 在字符串中出现的次数。
- 计算其与镜像字符出现次数之间的 **绝对差**，定义为： `|freq(c) - freq(m)|`

镜像对 `(c, m)` 和 `(m, c)` 被视为相同，只能被计算 **一次**。

返回一个整数，表示所有这些 **不同的镜像对** 的绝对差之和。

**示例 1：**

**输入：** s = "ab1z9"

**输出：** 3

**解释：**

对于每个镜像对：

| `c` | `m` | `freq(c)` | `freq(m)` | `|freq(c) - freq(m)|` |
| --- | --- | --- | --- | --- |
| a | z | 1 | 1 | 0 |
| b | y | 1 | 0 | 1 |
| 1 | 8 | 1 | 0 | 1 |
| 9 | 0 | 1 | 0 | 1 |

因此，答案是 `0 + 1 + 1 + 1 = 3`。

**示例 2：**

**输入：** s = "4m7n"

**输出：** 2

**解释：**

| `c` | `m` | `freq(c)` | `freq(m)` | `|freq(c) - freq(m)|` |
| --- | --- | --- | --- | --- |
| 4 | 5 | 1 | 0 | 1 |
| m | n | 1 | 1 | 0 |
| 7 | 2 | 1 | 0 | 1 |

因此，答案是 `1 + 0 + 1 = 2`。

**示例 3：**

**输入：** s = "byby"

**输出：** 0

**解释：**

| `c` | `m` | `freq(c)` | `freq(m)` | `|freq(c) - freq(m)|` |
| --- | --- | --- | --- | --- |
| b | y | 2 | 2 | 0 |

因此，答案是 0 。

**提示:**

- `1 <= s.length <= 5 * 10⁵`
- `s` 仅由小写英文字母和数字组成。

*/

package main

import (
	"bufio"
	"fmt"
	"os"

	. "github.com/j178/leetgo/testutils/go"
)

// @lc code=begin

func mirrorFrequency(s string) (ans int) {
	freq := make(map[rune]int)
	for _, c := range s {
		freq[c]++
	}

	abs := func(x int) int {
		if x < 0 {
			return -x
		}
		return x
	}

	// 遍历每组镜像对的前半部分，累加频次差的绝对值
	for _, pair := range [][2]rune{{'a', 'z'}, {'0', '9'}} {
		lo, hi := pair[0], pair[1]
		for c := lo; c <= (lo+hi)/2; c++ {
			ans += abs(freq[c] - freq[lo+hi-c])
		}
	}

	return
}

// @lc code=end

func main() {
	stdin := bufio.NewReader(os.Stdin)
	s := Deserialize[string](ReadLine(stdin))
	ans := mirrorFrequency(s)

	fmt.Println("\noutput:", Serialize(ans))
}
