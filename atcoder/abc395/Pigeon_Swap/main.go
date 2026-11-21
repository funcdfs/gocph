// link: https://atcoder.jp/contests/abc395/tasks/abc395_d
// time: 2026-02-06 13:01:59 https://github.com/funcdfs


// #region main
package main; import ( "bufio"; "fmt"; "os"; "runtime"; "strings" ); var _in, _out = new(bufio.Reader), new(bufio.Writer)
func _github_funcdfs[T any](sep, end string, arr ...T) { for idx := range arr { fmt.Fprint(_out, arr[idx]); if idx == len(arr)-1 { fmt.Fprint(_out, end); } else { fmt.Fprint(_out, sep) } } }
func main() { _in = bufio.NewReader(os.Stdin); _out = bufio.NewWriter(os.Stdout); defer _out.Flush(); solve() }
func input      [T any] ()           T { var value T; fmt.Fscan(_in, &value); return value }
func inputSlice [T any] (size int) []T { data := make([]T, size); for idx := 0; idx < size; idx++ { data[idx] = input[T](); }; return data }
func print      [T any] (arr ...T)     { _github_funcdfs("", "", arr...) }
func println    [T any] (arr ...T)     { _github_funcdfs(" ", "\n", arr...) }
func dbg(args ...any) { _, f, l, _ := runtime.Caller(1); fmt.Fprintf(os.Stderr, "L%d: ", l); msg := ""; if f, err := os.Open(f); err == nil { defer f.Close(); s := bufio.NewScanner(f); for i := 1; i <= l; i++ { s.Scan() }; msg = s.Text(); if i := strings.Index(msg, "dbg("); i >= 0 { msg = msg[i+4:]; if i := strings.LastIndex(msg, ")"); i >= 0 { msg = msg[:i] } } }; names := strings.Split(msg, ","); for i, v := range args { n := ""; if i < len(names) { n = strings.TrimSpace(names[i]) }; if n != "" { fmt.Fprintf(os.Stderr, "[%s]={%v} ", n, v) } else { fmt.Fprintf(os.Stderr, "{%v} ", v) } }; fmt.Fprintln(os.Stderr) }
// #endregion main


// ----------------------------- /* Start of useful functions */ -----------------------------

func solve() {

	n, k := input[int](), input[int]()
	zoom := make([][]int, n+1)
	pos := make(map[int]int)
	for i := range n {
		zoom[i+1] = make([]int, 1, n+1)
		zoom[i+1][0] = i+1
		pos[i+1] = i+1 
	}
	// 每一次调用 3 的操作的时候都是 O(n)
	// for i := range k {
	// 	op := input[int]()
	// 	if op == 1 {
	// 	} else if op == 2 {
	// 	} else if op == 3 {
	// 	}
	// }
	// use map to store idx value 
	for range k {
		op := input[int]()
		if op == 1 {
			a, b := input[int](), input[int]()
			// mvoe a to zoom b 
			_, _ = a, b // TODO: 待实现
			
		} else if op == 2 {
			a, b := input[int](), input[int]()
			zoom[a], zoom[b] = zoom[b], zoom[a]
			for i := range zoom[a] {
				pos[zoom[a][i]] = b 
			} 
			for i := range zoom[b] {
				pos[zoom[b][i]] = a
			}		} else if op == 3 {
			val := input[int]()
			println(pos[val])
		}
	}
}

// ----------------------------- /* End of useful functions */ -------------------------------