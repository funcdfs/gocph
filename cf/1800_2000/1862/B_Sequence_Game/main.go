// link: https://codeforces.com/contest/1862/problem/B
// time: 2026-03-22 11:45:14 https://github.com/funcdfs

// #region main
package main

import (
	"bufio"
	"fmt"
	"os"
	"runtime"
	"strings"
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
func dbg(args ...any) {
	_, f, l, _ := runtime.Caller(1)
	fmt.Fprintf(os.Stderr, "L%d: ", l)
	msg := ""
	if f, err := os.Open(f); err == nil {
		defer f.Close()
		s := bufio.NewScanner(f)
		for i := 1; i <= l; i++ {
			s.Scan()
		}
		msg = s.Text()
		if i := strings.Index(msg, "dbg("); i >= 0 {
			msg = msg[i+4:]
			if i := strings.LastIndex(msg, ")"); i >= 0 {
				msg = msg[:i]
			}
		}
	}
	names := strings.Split(msg, ",")
	for i, v := range args {
		n := ""
		if i < len(names) {
			n = strings.TrimSpace(names[i])
		}
		if n != "" {
			fmt.Fprintf(os.Stderr, "[%s]={%v} ", n, v)
		} else {
			fmt.Fprintf(os.Stderr, "{%v} ", v)
		}
	}
	fmt.Fprintln(os.Stderr)
}

// #endregion main

// ----------------------------- /* Start of useful functions */ -----------------------------
func solve(_case int) {

	n := input[int]()
	b := inputSlice[int](n)

	/*
	
	给定一个长度为 $n$ 的目标序列 $B$。要求构造一个长度为 $m$ 的序列 $A$
	（需满足 $n \le m \le 2n$），
	使得序列 $A$ 经过以下过滤规则后能精确生成序列 $B$：
	提取 $A_1$ 作为新序列的第一个元素。
	对于 $2 \le i \le m$，当且仅当 $A_{i-1} \le A_i$ 时，提取 $A_i$ 附加到新序列末尾。

	*/

	a := make([]int, 0, 2*n)
	a = append(a, b[0])
	for i := 1; i < n; i++ {
		if b[i] == 1 && b[i-1] != 1 {
			a = append(a, []int{1, 1}...)
		} else if b[i] == 1 && b[i-1] == 1 {
			a = append(a, 1)
		} else if b[i] > b[i-1] {
			a = append(a, b[i])
		} else {
			a = append(a, b[i]-1)
			a = append(a, b[i])
		}
	}

	println(len(a))
	println(a...)

}

// ----------------------------- /* End of useful functions */ -------------------------------