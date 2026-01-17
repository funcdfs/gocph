package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// ================================ Types ================================

type TestCase struct {
	Input  string `json:"input"`
	Output string `json:"output"`
}

type Problem struct {
	Name        string     `json:"name"`
	Group       string     `json:"group"`
	URL         string     `json:"url"`
	MemoryLimit int        `json:"memoryLimit"`
	TimeLimit   int        `json:"timeLimit"`
	Tests       []TestCase `json:"tests"`
}

// ================================ Constants ================================

const (
	cReset   = "\033[0m"
	cGreen   = "\033[38;2;41;148;75m"
	cYellow  = "\033[38;2;163;166;124m"
	cBlue    = "\033[38;2;74;121;217m"
	cMagenta = "\033[38;2;152;124;166m"
	cCyan    = "\033[38;2;101;194;167m"
	cGray    = "\033[38;2;111;111;111m"

	defaultPort = 10043
)

// ================================ Main ================================

func main() {
	if len(os.Args) > 1 && (os.Args[1] == "-h" || os.Args[1] == "--help") {
		fmt.Println("Usage: go run gen.go")
		fmt.Println("  Start HTTP server on port 10043 for Competitive Companion")
		return
	}
	runServer()
}

// ================================ Server ================================

func runServer() {
	fmt.Printf("\n%s[*]%s Port: %s%d%s\n\n", cCyan, cReset, cMagenta, defaultPort, cReset)

	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	problemChan := make(chan Problem)

	go func() {
		http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				http.Error(w, "POST only", http.StatusMethodNotAllowed)
				return
			}

			body, _ := io.ReadAll(r.Body)
			var problem Problem
			if err := json.NewDecoder(bytes.NewBuffer(body)).Decode(&problem); err != nil {
				http.Error(w, "Invalid JSON", http.StatusBadRequest)
				return
			}

			problemChan <- problem
			w.WriteHeader(http.StatusOK)
		})

		if err := http.ListenAndServe(fmt.Sprintf(":%d", defaultPort), nil); err != nil {
			log.Printf("Server error: %v", err)
			done <- syscall.SIGTERM
		}
	}()

	go func() {
		for problem := range problemChan {
			if err := generateFiles(problem); err != nil {
				log.Printf("Error: %v", err)
			}
			fmt.Printf("\n%s[=]%s %sWaiting...%s\n", cBlue, cReset, cGray, cReset)
		}
	}()

	<-done
	fmt.Println("\nShutting down...")
}

// ================================ File Generation ================================

func generateFiles(problem Problem) error {
	dirPath := calculateDirPath(problem.URL, problem.Name)

	dirPath, err := handleExistingDir(dirPath)
	if err != nil {
		return err
	}
	if dirPath == "" {
		fmt.Printf("%s[!]%s 已取消\n", cYellow, cReset)
		return nil
	}

	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return err
	}

	currentTime := time.Now().Format("2006-01-02 15:04:05")

	// Generate main.go (只有注释和空行)
	mainContent := fmt.Sprintf("// link: %s\n// time: %s https://github.com/funcdfs\n\n\n", problem.URL, currentTime)
	if err := os.WriteFile(filepath.Join(dirPath, "main.go"), []byte(mainContent), 0644); err != nil {
		return err
	}

	// Generate main_test.go
	testContent := generateTestFile(problem, currentTime)
	if err := os.WriteFile(filepath.Join(dirPath, "main_test.go"), []byte(testContent), 0644); err != nil {
		return err
	}

	printInfo(problem, dirPath)
	return nil
}

func generateTestFile(problem Problem, currentTime string) string {
	var sb strings.Builder
	sb.WriteString("package main\n\n")
	sb.WriteString("import (\n")
	sb.WriteString("\t\"testing\"\n\n")
	sb.WriteString("\t. \"github.com/funcdfs/algo/tool/testutil\"\n")
	sb.WriteString(")\n\n")
	sb.WriteString(fmt.Sprintf("// Contest: %s %s\n", problem.Group, problem.Name))
	sb.WriteString(fmt.Sprintf("// URL: %s\n", problem.URL))
	sb.WriteString(fmt.Sprintf("// Time: %s\n\n", currentTime))
	sb.WriteString("func TestSolution(t *testing.T) {\n")
	sb.WriteString("\tRun(t, []Case{\n")

	for i, test := range problem.Tests {
		input := test.Input
		if !strings.HasSuffix(input, "\n") {
			input += "\n"
		}
		output := test.Output
		if !strings.HasSuffix(output, "\n") {
			output += "\n"
		}
		sb.WriteString(fmt.Sprintf("\n\t\t// case %d\n", i+1))
		sb.WriteString(fmt.Sprintf("\t\tC(`\n%s`, `\n%s`),\n", input, output))
	}

	sb.WriteString("\t}, main)\n")
	sb.WriteString("}\n")
	return sb.String()
}

func handleExistingDir(dirPath string) (string, error) {
	if _, err := os.Stat(dirPath); os.IsNotExist(err) {
		return dirPath, nil
	}

	folderName := filepath.Base(dirPath)
	fmt.Printf("\n%s[?]%s 文件夹 \"%s\" 已存在，请选择操作：\n", cYellow, cReset, folderName)
	fmt.Printf("    %s1%s) 取消\n", cGray, cReset)
	fmt.Printf("    %s2%s) 覆盖\n", cGray, cReset)
	fmt.Printf("    %s3%s) 新增\n", cGray, cReset)
	fmt.Printf("%s[>]%s 请输入选项 (1/2/3): ", cCyan, cReset)

	var choice string
	fmt.Scanln(&choice)

	switch choice {
	case "2":
		return dirPath, nil
	case "3":
		return findNextAvailablePath(dirPath), nil
	default:
		return "", nil
	}
}

func findNextAvailablePath(basePath string) string {
	idx := 2
	for {
		newPath := fmt.Sprintf("%s_%d", basePath, idx)
		if _, err := os.Stat(newPath); os.IsNotExist(err) {
			return newPath
		}
		idx++
	}
}

// ================================ Path Calculation ================================
// 与 gocph/src/pathGenerator.ts 保持一致

func calculateDirPath(url, problemName string) string {
	cleanedName := cleanName(problemName)
	platform := getPlatform(url)

	switch platform {
	case "codeforces":
		return cfPath(url, cleanedName)
	case "atcoder":
		return atcoderPath(url, cleanedName)
	case "acwing":
		return acwingPath(url, cleanedName)
	case "luogu":
		return luoguPath(url, cleanedName)
	case "nowcoder":
		return nowcoderPath(cleanedName)
	default:
		return filepath.Join("others", cleanedName)
	}
}

func getPlatform(url string) string {
	switch {
	case strings.Contains(url, "codeforces.com"):
		return "codeforces"
	case strings.Contains(url, "atcoder.jp"):
		return "atcoder"
	case strings.Contains(url, "acwing.com"):
		return "acwing"
	case strings.Contains(url, "luogu.com.cn"):
		return "luogu"
	case strings.Contains(url, "nowcoder.com"):
		return "nowcoder"
	default:
		return "other"
	}
}

// Codeforces: cf/{区间}/{contestId}/{problemId}_{name}/
func cfPath(url, name string) string {
	parts := strings.Split(url, "/")
	var contestID, problemID string

	for i, part := range parts {
		if part == "contest" && i+1 < len(parts) {
			contestID = parts[i+1]
		}
		if part == "problem" && i+1 < len(parts) {
			problemID = strings.ToUpper(parts[i+1])
		}
	}

	if contestID == "" {
		return filepath.Join("cf", "unknown", name)
	}

	// 提取数字部分
	re := regexp.MustCompile(`\d+`)
	contestNum := re.FindString(contestID)
	if contestNum == "" {
		return filepath.Join("cf", "unknown", name)
	}

	num, _ := strconv.Atoi(contestNum)
	rangeStart := (num / 200) * 200
	rangeDir := fmt.Sprintf("%d_%d", rangeStart, rangeStart+200)

	folderName := name
	if problemID != "" {
		folderName = fmt.Sprintf("%s_%s", problemID, name)
	}

	return filepath.Join("cf", rangeDir, contestNum, folderName)
}

// AtCoder: atcoder/{contest}/{name}/
func atcoderPath(url, name string) string {
	parts := strings.Split(url, "/")
	var contest string

	for i, part := range parts {
		if part == "contests" && i+1 < len(parts) {
			contest = strings.ToLower(parts[i+1])
			break
		}
	}

	if contest == "" {
		return filepath.Join("atcoder", "unknown", name)
	}
	return filepath.Join("atcoder", contest, name)
}

// AcWing: acwing/{problemId}_{name}/
func acwingPath(url, name string) string {
	parts := strings.Split(url, "/")
	var problemID string

	for i, part := range parts {
		if part == "problem" && i+2 < len(parts) && parts[i+1] == "content" {
			problemID = strings.TrimSuffix(parts[i+2], "/")
			break
		}
	}

	if problemID == "" {
		return filepath.Join("acwing", name)
	}
	return filepath.Join("acwing", fmt.Sprintf("%s_%s", problemID, name))
}

// Luogu: luogu/{problemId}_{name}/
func luoguPath(url, name string) string {
	parts := strings.Split(url, "/")
	var problemID string

	for i, part := range parts {
		if part == "problem" && i+1 < len(parts) {
			problemID = parts[i+1]
			break
		}
	}

	if problemID == "" {
		return filepath.Join("luogu", name)
	}
	return filepath.Join("luogu", fmt.Sprintf("%s_%s", problemID, name))
}

// NowCoder: nowcoder/{name}/
func nowcoderPath(name string) string {
	return filepath.Join("nowcoder", name)
}

// cleanName 清理题目名称
// - 移除开头的题号前缀 (A - , B. , C1 - 等)
// - 保留中文、字母、数字，其他替换为下划线
// - 合并连续下划线，去除首尾下划线
func cleanName(s string) string {
	// 移除开头的题号前缀
	prefixRe := regexp.MustCompile(`^[A-Za-z]\d*\s*[-.:]\s*`)
	s = prefixRe.ReplaceAllString(s, "")
	// 保留中文、字母、数字
	re := regexp.MustCompile(`[^\p{Han}\p{Latin}0-9]+`)
	s = re.ReplaceAllString(s, "_")
	// 合并连续下划线
	s = regexp.MustCompile(`_{2,}`).ReplaceAllString(s, "_")
	return strings.Trim(s, "_")
}

// ================================ Output ================================

func printInfo(problem Problem, dirPath string) {
	fmt.Printf("\n%s╔════════════════════════════════════════════════════╗%s\n", cYellow, cReset)
	printField("URL", problem.URL, cBlue)
	printField("NAME", problem.Name, cGreen)
	printField("PATH", dirPath, cCyan)
	printField("TIME", time.Now().Format("2006-01-02 15:04:05"), cGray)
	fmt.Printf("%s╚════════════════════════════════════════════════════╝%s\n", cYellow, cReset)
}

func printField(label, value, color string) {
	fmt.Printf("%s║%s %s%-6s%s %s%s%s\n", cYellow, cReset, cCyan, label, cReset, color, truncate(value, 45), cReset)
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max-3] + "..."
}
