// link: https://codeforces.com/contest/1872/problem/A
// time: 2026-02-04 16:34:26 https://github.com/funcdfs

// #region main
package main

import (
	"bufio"
	"fmt"
	"math"
	"os"
)

var _in, _out = new(bufio.Reader), new(bufio.Writer)

func _github_funcdfs[T any](sep, end string, arr ...T) {
	for idx := range arr {
		fmt.Fprint(_out, arr[idx])
		if idx == len(arr)-1 {
			fmt.Fprint(_out, end)
		} else {
			fmt.Fprint(_out, sep)
		}
	}
}
func main() {
	_in = bufio.NewReader(os.Stdin)
	_out = bufio.NewWriter(os.Stdout)
	defer _out.Flush()
	testCaseCnt := input[int]()
	for i := 0; i < testCaseCnt; i++ {
		solve(i + 1)
	}
}
func input[T any]() T { var value T; fmt.Fscan(_in, &value); return value }
func inputSlice[T any](size int) []T {
	data := make([]T, size)
	for idx := 0; idx < size; idx++ {
		data[idx] = input[T]()
	}
	return data
}
func print[T any](arr ...T)   { _github_funcdfs("", "", arr...) }
func println[T any](arr ...T) { _github_funcdfs(" ", "\n", arr...) }

// #endregion main

// ----------------------------- /* Start of useful functions */ -----------------------------
// ----------------------------- /* Start of useful functions */ -----------------------------
func solve(_case int) {

	a, b := input[int](), input[int]()
	c := input[int]()

	diff := abs(a - b)

	if diff == 0 {
		println(0)
		return
	}
	if float64(diff) / 2.0 <= float64(c) {
		println(1)
		return
	}

	afterOneStep := math.MaxInt32
	if a > b {
		a -= c
		b += c
	} else {
		b -= c
		a += c
	}
	afterOneStep = abs(a - b)
	// 一次可以影响的，数量是 diff - afterOneStep
	count := diff / (diff - afterOneStep)
	if diff%(diff-afterOneStep) != 0 {
		count++
	}
	println(count)

}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

// ----------------------------- /* End of useful functions */ -------------------------------