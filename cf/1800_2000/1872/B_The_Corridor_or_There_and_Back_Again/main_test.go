package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: Codeforces - Codeforces Round 895 (Div. 3) B. The Corridor or There and Back Again
// URL: https://codeforces.com/contest/1872/problem/B
// Time: 2026-02-04 16:41:48

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
7
1
2 2
3
2 8
4 3
5 2
1
200 200
4
1 20
5 9
3 179
100 1
2
10 1
1 18
2
1 1
1 2
3
1 3
1 1
1 3
`, `
2
5
299
9
9
1
1
`),
	}, main)
}
