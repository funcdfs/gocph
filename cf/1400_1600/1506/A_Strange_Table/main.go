// link: https://codeforces.com/contest/1506/problem/A
// time: 2026-02-05 00:37:21 https://github.com/funcdfs


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

	n, m, x := input[int64](), input[int64](), input[int64]()
	row := (x - 1) / n
	col := (x - 1) % n
	println(col*m + row + 1)

}
/*
波利卡普发现一张长方形表格，其中有 $n$ 行和 $m$ 列。他注意到，表格的每个单元格都有自己的数字，这些数字是通过以下算法**"按列 "**得到的：

- 单元格从 1 开始编号；
- 单元格从左到右按列编号，每列内部从上到下编号；
- 每个单元格的编号都是比前一个单元格大 1 的整数。

例如，如果 $n = 3$ 和 $m = 5$ ，表格的编号将如下：

$$
\begin{matrix} 1 & 4 & 7 & 10 & 13 \\ 2 & 5 & 8 & 11 & 14 \\ 3 & 6 & 9 & 12 & 15 \\ \end{matrix}
$$

然而，波利卡普认为这样的编号不方便。他喜欢**"按行 "**的编号方式：

- 单元格从 1 开始编号；
- 单元格按行从上到下编号，每行内部从左到右编号；
- 每个单元格的编号是一个大于前一个单元格编号的整数。

例如，如果 $n = 3$ 和 $m = 5$ ，那么波利卡普喜欢下面的表格编号：

$$
\begin{matrix} 1 & 2 & 3 & 4 & 5 \\ 6 & 7 & 8 & 9 & 10 \\ 11 & 12 & 13 & 14 & 15 \\ \end{matrix}
$$

波利卡普没有太多时间，所以他要求您找出，如果在**"按行 "**的编号中，单元格的编号是 $x$ ，那么在**"按列 "**的编号中，单元格的编号是多少？
*/
// ----------------------------- /* End of useful functions */ -------------------------------