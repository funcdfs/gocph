package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: Codeforces - Codeforces Round 935 (Div. 3) C. Left and Right Houses
// URL: https://codeforces.com/contest/1945/problem/C
// Time: 2026-08-30 23:37:30

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
7
3
101
6
010111
6
011001
3
000
3
110
3
001
4
1100
`, `
2
3
2
3
0
1
0
`),
	}, main)
}

/*

对于一个长度为 n 的 0,1 序列 a 
i
​
 ，找到最靠近中心的点使得这个点左边的 0 的数量不少于这个点左边所有点个数的一半（包括这个点），这个点右边 1 的数量不少于这个点右边所有点的个数的一半（不包括这个点）。

*/
