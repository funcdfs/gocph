package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: Codeforces - Codeforces Round 895 (Div. 3) C. Non-coprime Split
// URL: https://codeforces.com/contest/1872/problem/C
// Time: 2026-02-05 00:10:03

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
11
11 15
1 3
18 19
41 43
777 777
8000000 10000000
2000 2023
1791791 1791791
1 4
2 3
9840769 9840769
`, `
2 10
-1
2 16
2 40
3 774
2 7999998
2 1998
-1
2 2
-1
3137 9837632
`),
	}, main)
}
