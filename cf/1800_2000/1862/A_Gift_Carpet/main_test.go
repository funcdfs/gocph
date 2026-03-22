package main

import (
	"testing"

	. "github.com/funcdfs/gocph/tool/testutil"
)

// Contest: Codeforces - Codeforces Round 894 (Div. 3) A. Gift Carpet
// URL: https://codeforces.com/contest/1862/problem/A
// Time: 2026-03-22 11:21:04

func TestSolution(t *testing.T) {
	Run(t, []Case{
		// case 1
		C(`
5
1 4
vika
3 3
bad
car
pet
4 4
vvvv
iiii
kkkk
aaaa
4 4
vkak
iiai
avvk
viaa
4 7
vbickda
vbickda
vbickda
vbickda
`, `
YES
NO
YES
NO
YES
`),
	}, main)
}

/*

*/
