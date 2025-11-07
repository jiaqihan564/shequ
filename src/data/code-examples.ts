import type { CodeExamplesData } from '@/types/code'

export const codeExamples: CodeExamplesData = {
  // Python 示例（8个）
  python: [
    {
      id: 'python-hello',
      title: 'Hello World',
      description: '基础输出示例',
      code: `# Python Hello World
print("Hello, World!")
print("欢迎使用在线代码编辑器！")`,
      expectedOutput: 'Hello, World!\n欢迎使用在线代码编辑器!'
    },
    {
      id: 'python-variables',
      title: '变量和数据类型',
      description: '字符串、数字、列表、字典的使用',
      code: `# 变量和数据类型
# 字符串
name = "Alice"
print(f"姓名: {name}")

# 数字
age = 25
height = 1.75
print(f"年龄: {age}, 身高: {height}m")

# 列表
fruits = ["苹果", "香蕉", "橙子"]
print(f"水果列表: {fruits}")

# 字典
person = {"name": "Bob", "age": 30, "city": "北京"}
print(f"个人信息: {person}")`,
      expectedOutput: '姓名: Alice\n年龄: 25, 身高: 1.75m\n...'
    },
    {
      id: 'python-conditions',
      title: '条件判断',
      description: 'if/elif/else 分支结构',
      code: `# 条件判断
score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
elif score >= 60:
    grade = "D"
else:
    grade = "F"

print(f"分数: {score}, 等级: {grade}")

# 多条件判断
age = 18
has_license = True

if age >= 18 and has_license:
    print("可以开车")
else:
    print("不能开车")`,
      expectedOutput: '分数: 85, 等级: B\n可以开车'
    },
    {
      id: 'python-loops',
      title: '循环遍历',
      description: 'for 和 while 循环',
      code: `# for 循环
print("=== For 循环 ===")
for i in range(1, 6):
    print(f"数字: {i}")

# 遍历列表
fruits = ["苹果", "香蕉", "橙子"]
for fruit in fruits:
    print(f"水果: {fruit}")

# while 循环
print("\\n=== While 循环 ===")
count = 1
while count <= 5:
    print(f"计数: {count}")
    count += 1`,
      expectedOutput: '=== For 循环 ===\n数字: 1\n...'
    },
    {
      id: 'python-functions',
      title: '函数定义',
      description: '定义和调用函数',
      code: `# 函数定义
def greet(name):
    """问候函数"""
    return f"你好, {name}!"

def add(a, b):
    """加法函数"""
    return a + b

def calculate_area(length, width):
    """计算矩形面积"""
    area = length * width
    return area

# 调用函数
print(greet("Alice"))
print(f"5 + 3 = {add(5, 3)}")
print(f"矩形面积: {calculate_area(10, 5)}")

# 带默认参数的函数
def power(base, exponent=2):
    return base ** exponent

print(f"2的平方: {power(2)}")
print(f"2的三次方: {power(2, 3)}")`,
      expectedOutput: '你好, Alice!\n5 + 3 = 8\n...'
    },
    {
      id: 'python-list-comprehension',
      title: '列表推导式',
      description: '高级列表操作',
      code: `# 列表推导式
# 生成平方数列表
squares = [x**2 for x in range(1, 11)]
print(f"平方数: {squares}")

# 筛选偶数
numbers = range(1, 21)
evens = [n for n in numbers if n % 2 == 0]
print(f"偶数: {evens}")

# 字符串处理
words = ["hello", "world", "python"]
upper_words = [w.upper() for w in words]
print(f"大写: {upper_words}")

# 嵌套列表推导
matrix = [[i*j for j in range(1, 4)] for i in range(1, 4)]
print(f"乘法表:")
for row in matrix:
    print(row)`,
      expectedOutput: '平方数: [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]\n...'
    },
    {
      id: 'python-string-operations',
      title: '字符串操作',
      description: '字符串处理和格式化',
      code: `# 字符串操作
text = "  Hello Python  "

# 基本操作
print(f"原始: '{text}'")
print(f"去空格: '{text.strip()}'")
print(f"大写: '{text.upper()}'")
print(f"小写: '{text.lower()}'")

# 分割和连接
sentence = "Python,Java,JavaScript"
languages = sentence.split(",")
print(f"分割: {languages}")
print(f"连接: {'-'.join(languages)}")

# 查找和替换
message = "I love Python programming"
print(f"查找 'Python': {message.find('Python')}")
print(f"替换: {message.replace('Python', 'Go')}")

# 格式化
name, age = "Alice", 25
print(f"格式化: {name} is {age} years old")`,
      expectedOutput: "原始: '  Hello Python  '\n..."
    },
    {
      id: 'python-fibonacci',
      title: '斐波那契数列',
      description: '经典算法示例',
      code: `# 斐波那契数列
def fibonacci(n):
    """生成斐波那契数列"""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib

# 生成前10个斐波那契数
result = fibonacci(10)
print(f"斐波那契数列(前10个): {result}")

# 递归实现（单个数）
def fib_recursive(n):
    if n <= 1:
        return n
    return fib_recursive(n-1) + fib_recursive(n-2)

print(f"\\n第10个斐波那契数: {fib_recursive(10)}")`,
      expectedOutput: '斐波那契数列(前10个): [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\n...'
    },
    {
      id: 'python-dict-operations',
      title: '字典高级操作',
      description: '字典的合并、筛选、排序',
      code: `# 字典高级操作
# 创建字典
person = {'name': 'Alice', 'age': 25, 'city': 'Beijing'}
print("原始字典:", person)

# 字典合并
extra_info = {'job': 'Engineer', 'hobby': 'Reading'}
person.update(extra_info)
print("\\n合并后:", person)

# 字典推导式
numbers = {'one': 1, 'two': 2, 'three': 3, 'four': 4}
doubled = {k: v*2 for k, v in numbers.items()}
print("\\n翻倍:", doubled)

# 筛选字典
filtered = {k: v for k, v in numbers.items() if v > 2}
print("大于2:", filtered)

# 字典排序
scores = {'Alice': 95, 'Bob': 78, 'Charlie': 92, 'David': 85}
sorted_by_value = dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))
print("\\n按分数排序:", sorted_by_value)

# get 方法使用默认值
age = person.get('age', 0)
salary = person.get('salary', 'N/A')
print(f"\\n年龄: {age}, 薪资: {salary}")

# setdefault 方法
person.setdefault('country', 'China')
print("\\n添加默认值后:", person)`,
      expectedOutput: "原始字典: {'name': 'Alice', 'age': 25, 'city': 'Beijing'}\n..."
    },
    {
      id: 'python-exception-handling',
      title: '异常处理',
      description: 'try/except/finally 使用',
      code: `# 异常处理
print("=== 基本异常处理 ===")
try:
    result = 10 / 2
    print(f"结果: {result}")
    
    # 这会引发异常
    error_result = 10 / 0
except ZeroDivisionError as e:
    print(f"捕获到异常: {e}")
finally:
    print("finally 块总是执行")

# 多个 except
print("\\n=== 多个异常类型 ===")
def process_data(data):
    try:
        # 可能的类型错误
        number = int(data)
        # 可能的除零错误
        result = 100 / number
        return result
    except ValueError:
        print("无法转换为数字")
        return None
    except ZeroDivisionError:
        print("不能除以零")
        return None
    except Exception as e:
        print(f"其他错误: {e}")
        return None

print(process_data("20"))
print(process_data("abc"))
print(process_data("0"))

# 自定义异常
print("\\n=== 自定义异常 ===")
class AgeError(Exception):
    pass

def check_age(age):
    if age < 0:
        raise AgeError("年龄不能为负数")
    elif age > 150:
        raise AgeError("年龄不合理")
    return f"年龄验证通过: {age}"

try:
    print(check_age(25))
    print(check_age(-5))
except AgeError as e:
    print(f"年龄错误: {e}")`,
      expectedOutput: '=== 基本异常处理 ===\n结果: 5.0\n捕获到异常: division by zero\n...'
    },
    {
      id: 'python-generators',
      title: '生成器',
      description: 'yield 和生成器表达式',
      code: `# 生成器
# 基本生成器
def count_up_to(n):
    """生成从1到n的数字"""
    count = 1
    while count <= n:
        yield count
        count += 1

print("=== 基本生成器 ===")
for num in count_up_to(5):
    print(num, end=' ')
print()

# 斐波那契生成器
def fibonacci_gen(n):
    """生成斐波那契数列"""
    a, b = 0, 1
    count = 0
    while count < n:
        yield a
        a, b = b, a + b
        count += 1

print("\\n=== 斐波那契生成器 ===")
fib = list(fibonacci_gen(10))
print(f"前10个: {fib}")

# 生成器表达式
print("\\n=== 生成器表达式 ===")
squares_gen = (x**2 for x in range(1, 6))
print(f"平方数: {list(squares_gen)}")

# 实用生成器：读取大文件（模拟）
def read_lines(text):
    """模拟逐行读取"""
    lines = text.split('\\n')
    for line in lines:
        yield line.strip()

data = """第一行
第二行
第三行"""

print("\\n=== 逐行处理 ===")
for line in read_lines(data):
    if line:
        print(f"处理: {line}")

# 无限生成器
def infinite_sequence():
    num = 0
    while True:
        yield num
        num += 1

print("\\n=== 无限序列（前5个）===")
seq = infinite_sequence()
for _ in range(5):
    print(next(seq), end=' ')
print()`,
      expectedOutput: '=== 基本生成器 ===\n1 2 3 4 5\n=== 斐波那契生成器 ===\n...'
    },
    {
      id: 'python-decorators',
      title: '装饰器',
      description: '函数装饰器的使用',
      code: `# 装饰器
import time

# 简单装饰器
def timer_decorator(func):
    """计时装饰器"""
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} 执行时间: {(end-start)*1000:.2f}ms")
        return result
    return wrapper

@timer_decorator
def slow_function():
    """模拟慢函数"""
    time.sleep(0.1)
    return "完成"

print("=== 计时装饰器 ===")
slow_function()

# 带参数的装饰器
def repeat(times):
    """重复执行装饰器"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            results = []
            for _ in range(times):
                result = func(*args, **kwargs)
                results.append(result)
            return results
        return wrapper
    return decorator

@repeat(3)
def greet(name):
    return f"Hello, {name}!"

print("\\n=== 重复装饰器 ===")
results = greet("Alice")
for r in results:
    print(r)

# 日志装饰器
def log_call(func):
    """记录函数调用"""
    def wrapper(*args, **kwargs):
        print(f"调用 {func.__name__}")
        print(f"  参数: args={args}, kwargs={kwargs}")
        result = func(*args, **kwargs)
        print(f"  返回: {result}")
        return result
    return wrapper

@log_call
def add(a, b):
    return a + b

print("\\n=== 日志装饰器 ===")
add(5, 3)`,
      expectedOutput: '=== 计时装饰器 ===\nslow_function 执行时间: ...'
    }
  ],

  // JavaScript 示例（8个）
  javascript: [
    {
      id: 'js-hello',
      title: 'Hello World',
      description: 'console.log 基础输出',
      code: `// JavaScript Hello World
console.log("Hello, World!");
console.log("欢迎使用在线代码编辑器！");

// 变量声明
const greeting = "你好";
console.log(greeting + ", JavaScript!");`,
      expectedOutput: 'Hello, World!\n欢迎使用在线代码编辑器!\n...'
    },
    {
      id: 'js-variables',
      title: '变量和类型',
      description: 'let/const、数组、对象',
      code: `// 变量和类型
// let 和 const
let name = "Alice";
const age = 25;
console.log(\`姓名: \${name}, 年龄: \${age}\`);

// 数组
const fruits = ["苹果", "香蕉", "橙子"];
console.log("水果:", fruits);
console.log("第一个水果:", fruits[0]);

// 对象
const person = {
  name: "Bob",
  age: 30,
  city: "北京"
};
console.log("个人信息:", person);
console.log("城市:", person.city);

// 数组和对象结合
const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" }
];
console.log("用户列表:", users);`,
      expectedOutput: '姓名: Alice, 年龄: 25\n...'
    },
    {
      id: 'js-arrow-functions',
      title: '箭头函数',
      description: '现代 JavaScript 函数语法',
      code: `// 箭头函数
// 传统函数
function add(a, b) {
  return a + b;
}
console.log("传统函数:", add(5, 3));

// 箭头函数
const multiply = (a, b) => a * b;
console.log("箭头函数:", multiply(5, 3));

// 单参数箭头函数
const square = x => x * x;
console.log("平方:", square(5));

// 无参数箭头函数
const greet = () => "Hello!";
console.log(greet());

// 多行箭头函数
const calculate = (a, b) => {
  const sum = a + b;
  const product = a * b;
  return { sum, product };
};
console.log("计算结果:", calculate(4, 5));`,
      expectedOutput: '传统函数: 8\n箭头函数: 15\n...'
    },
    {
      id: 'js-array-methods',
      title: '数组方法',
      description: 'map/filter/reduce 高阶函数',
      code: `// 数组方法
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// map - 转换数组
const squares = numbers.map(n => n * n);
console.log("平方数:", squares);

// filter - 筛选数组
const evens = numbers.filter(n => n % 2 === 0);
console.log("偶数:", evens);

// reduce - 累积值
const sum = numbers.reduce((acc, n) => acc + n, 0);
console.log("总和:", sum);

// 组合使用
const result = numbers
  .filter(n => n % 2 === 0)  // 筛选偶数
  .map(n => n * 2)            // 乘以2
  .reduce((acc, n) => acc + n, 0);  // 求和
console.log("偶数翻倍后的和:", result);

// find - 查找元素
const found = numbers.find(n => n > 5);
console.log("第一个大于5的数:", found);`,
      expectedOutput: '平方数: [ 1, 4, 9, 16, 25, 36, 49, 64, 81, 100 ]\n...'
    },
    {
      id: 'js-promise',
      title: 'Promise 异步',
      description: '异步编程基础',
      code: `// Promise 异步编程
// 创建 Promise
const delay = (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

// 模拟异步操作
const fetchData = () => {
  return new Promise((resolve) => {
    console.log("开始获取数据...");
    // 模拟网络延迟
    setTimeout(() => {
      resolve({ id: 1, name: "Alice", age: 25 });
    }, 100);
  });
};

// 使用 Promise
console.log("=== Promise 示例 ===");
fetchData()
  .then(data => {
    console.log("获取到数据:", data);
    return data.name;
  })
  .then(name => {
    console.log("用户名:", name);
  })
  .catch(error => {
    console.error("错误:", error);
  })
  .finally(() => {
    console.log("操作完成");
  });

// 注意：由于是异步的，这行会先执行
console.log("主程序继续执行...");`,
      expectedOutput: '=== Promise 示例 ===\n开始获取数据...\n主程序继续执行...\n...'
    },
    {
      id: 'js-json',
      title: 'JSON 处理',
      description: '数据序列化和反序列化',
      code: `// JSON 处理
// 对象转 JSON
const user = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  hobbies: ["reading", "coding"]
};

const jsonString = JSON.stringify(user);
console.log("JSON 字符串:");
console.log(jsonString);

// 格式化 JSON
const prettyJson = JSON.stringify(user, null, 2);
console.log("\\n格式化 JSON:");
console.log(prettyJson);

// JSON 转对象
const jsonData = '{"name":"Bob","age":30}';
const obj = JSON.parse(jsonData);
console.log("\\n解析后的对象:", obj);
console.log("姓名:", obj.name);

// 深拷贝对象
const original = { a: 1, b: { c: 2 } };
const copy = JSON.parse(JSON.stringify(original));
console.log("\\n深拷贝:", copy);`,
      expectedOutput: 'JSON 字符串:\n{"id":1,"name":"Alice",...}\n...'
    },
    {
      id: 'js-string-methods',
      title: '字符串操作',
      description: '常见字符串方法',
      code: `// 字符串操作
const text = "  Hello JavaScript  ";

// 基本操作
console.log("原始:", text);
console.log("去空格:", text.trim());
console.log("大写:", text.toUpperCase());
console.log("小写:", text.toLowerCase());

// 分割和连接
const sentence = "JavaScript,Python,Java";
const languages = sentence.split(",");
console.log("\\n分割:", languages);
console.log("连接:", languages.join(" | "));

// 查找和替换
const message = "I love JavaScript";
console.log("\\n包含 'love':", message.includes("love"));
console.log("索引:", message.indexOf("JavaScript"));
console.log("替换:", message.replace("JavaScript", "Python"));

// 截取
console.log("\\nsubstring:", message.substring(0, 6));
console.log("slice:", message.slice(7));

// 模板字符串
const name = "Alice";
const age = 25;
console.log(\`\\n\${name} is \${age} years old\`);`,
      expectedOutput: '原始:   Hello JavaScript  \n...'
    },
    {
      id: 'js-quicksort',
      title: '快速排序',
      description: '快速排序算法实现',
      code: `// 快速排序算法
function quickSort(arr) {
  // 基本情况
  if (arr.length <= 1) {
    return arr;
  }
  
  // 选择基准值（中间元素）
  const pivot = arr[Math.floor(arr.length / 2)];
  
  // 分区
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  // 递归排序并合并
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

// 测试
const numbers = [64, 34, 25, 12, 22, 11, 90, 88, 45, 50];
console.log("原始数组:", numbers);

const sorted = quickSort(numbers);
console.log("排序后:", sorted);

// 反向排序
const descending = quickSort(numbers).reverse();
console.log("降序:", descending);`,
      expectedOutput: '原始数组: [ 64, 34, 25, 12, 22, 11, 90, 88, 45, 50 ]\n...'
    },
    {
      id: 'js-destructuring',
      title: '解构赋值',
      description: '数组和对象解构',
      code: `// 解构赋值
// 数组解构
const colors = ['red', 'green', 'blue', 'yellow'];
const [first, second, ...rest] = colors;

console.log("=== 数组解构 ===");
console.log("第一个:", first);
console.log("第二个:", second);
console.log("其余:", rest);

// 交换变量
let a = 1, b = 2;
[a, b] = [b, a];
console.log(\`\\n交换后: a=\${a}, b=\${b}\`);

// 对象解构
const person = {
  name: 'Alice',
  age: 25,
  city: 'Beijing',
  job: 'Engineer'
};

const { name, age, ...otherInfo } = person;
console.log("\\n=== 对象解构 ===");
console.log("姓名:", name);
console.log("年龄:", age);
console.log("其他信息:", otherInfo);

// 重命名
const { name: personName, city: location } = person;
console.log(\`\\n\${personName} 住在 \${location}\`);

// 默认值
const { salary = 50000, bonus = 0 } = person;
console.log(\`\\n薪资: \${salary}, 奖金: \${bonus}\`);

// 嵌套解构
const user = {
  id: 1,
  profile: {
    username: 'alice123',
    email: 'alice@example.com'
  }
};

const { profile: { username, email } } = user;
console.log(\`\\n用户名: \${username}, 邮箱: \${email}\`);

// 函数参数解构
function greet({ name, age = 18 }) {
  return \`Hello, \${name}! You are \${age} years old.\`;
}

console.log("\\n" + greet({ name: 'Bob', age: 30 }));
console.log(greet({ name: 'Charlie' }));`,
      expectedOutput: '=== 数组解构 ===\n第一个: red\n第二个: green\n...'
    },
    {
      id: 'js-async-await',
      title: 'Async/Await',
      description: '异步编程进阶',
      code: `// Async/Await
// 模拟异步操作
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUser(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id, name: \`User\${id}\`, age: 20 + id });
    }, 100);
  });
}

// 基本用法
async function getUser() {
  console.log("开始获取用户...");
  const user = await fetchUser(1);
  console.log("用户信息:", user);
  return user;
}

// 错误处理
async function getUserWithError() {
  try {
    const user = await fetchUser(2);
    console.log("\\n获取成功:", user);
  } catch (error) {
    console.error("错误:", error);
  }
}

// 并行执行
async function getMultipleUsers() {
  console.log("\\n=== 并行获取多个用户 ===");
  const start = Date.now();
  
  // 并行执行
  const users = await Promise.all([
    fetchUser(1),
    fetchUser(2),
    fetchUser(3)
  ]);
  
  const time = Date.now() - start;
  console.log("用户列表:", users);
  console.log(\`耗时: \${time}ms\`);
}

// 串行执行
async function getUsersSequentially() {
  console.log("\\n=== 串行获取用户 ===");
  const start = Date.now();
  
  const user1 = await fetchUser(1);
  const user2 = await fetchUser(2);
  const user3 = await fetchUser(3);
  
  const time = Date.now() - start;
  console.log("获取完成，耗时:", time + "ms");
}

// 执行所有示例
(async () => {
  await getUser();
  await getUserWithError();
  await getMultipleUsers();
  await getUsersSequentially();
  console.log("\\n所有任务完成");
})();`,
      expectedOutput: "开始获取用户...\n用户信息: { id: 1, name: 'User1', age: 21 }\n..."
    },
    {
      id: 'js-set-map',
      title: 'Set 和 Map',
      description: '集合和映射数据结构',
      code: `// Set 和 Map
// Set - 唯一值集合
console.log("=== Set 集合 ===");
const numbers = new Set([1, 2, 3, 3, 4, 4, 5]);
console.log("Set:", numbers);
console.log("大小:", numbers.size);

// Set 操作
numbers.add(6);
numbers.add(3); // 重复值不会添加
console.log("\\n添加后:", numbers);

numbers.delete(2);
console.log("删除2后:", numbers);

console.log("包含3?", numbers.has(3));

// Set 转数组
const arr = [...numbers];
console.log("\\n转为数组:", arr);

// 数组去重
const duplicates = [1, 2, 2, 3, 3, 3, 4, 5, 5];
const unique = [...new Set(duplicates)];
console.log("\\n去重前:", duplicates);
console.log("去重后:", unique);

// Map - 键值对
console.log("\\n=== Map 映射 ===");
const userMap = new Map();

userMap.set('alice', { age: 25, city: 'Beijing' });
userMap.set('bob', { age: 30, city: 'Shanghai' });
userMap.set('charlie', { age: 28, city: 'Guangzhou' });

console.log("Map 大小:", userMap.size);
console.log("Alice:", userMap.get('alice'));

// 遍历 Map
console.log("\\n遍历 Map:");
for (const [key, value] of userMap) {
  console.log(\`\${key}: \${JSON.stringify(value)}\`);
}

// Map 的 keys, values, entries
console.log("\\n所有键:", [...userMap.keys()]);
console.log("所有值:", [...userMap.values()]);

// 对象转 Map
const obj = { a: 1, b: 2, c: 3 };
const map = new Map(Object.entries(obj));
console.log("\\n对象转Map:", map);

// Map 转对象
const mapToObj = Object.fromEntries(map);
console.log("Map转对象:", mapToObj);`,
      expectedOutput: '=== Set 集合 ===\nSet: Set(5) { 1, 2, 3, 4, 5 }\n...'
    },
    {
      id: 'js-spread-rest',
      title: '展开和剩余运算符',
      description: '... 运算符的使用',
      code: `// 展开和剩余运算符
// 数组展开
console.log("=== 数组展开 ===");
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];
console.log("合并:", combined);

// 数组复制
const original = [1, 2, 3];
const copy = [...original];
copy.push(4);
console.log("\\n原数组:", original);
console.log("复制数组:", copy);

// 数组最大最小值
const nums = [5, 2, 8, 1, 9, 3];
console.log("\\n最大值:", Math.max(...nums));
console.log("最小值:", Math.min(...nums));

// 对象展开
console.log("\\n=== 对象展开 ===");
const person = { name: 'Alice', age: 25 };
const address = { city: 'Beijing', country: 'China' };
const fullInfo = { ...person, ...address, job: 'Engineer' };
console.log("完整信息:", fullInfo);

// 对象复制和更新
const user = { id: 1, name: 'Bob', role: 'user' };
const admin = { ...user, role: 'admin', permissions: ['read', 'write'] };
console.log("\\n用户:", user);
console.log("管理员:", admin);

// 剩余参数
console.log("\\n=== 剩余参数 ===");
function sum(...numbers) {
  return numbers.reduce((acc, num) => acc + num, 0);
}

console.log("sum(1, 2, 3):", sum(1, 2, 3));
console.log("sum(1, 2, 3, 4, 5):", sum(1, 2, 3, 4, 5));

// 结合普通参数
function greet(greeting, ...names) {
  return \`\${greeting}, \${names.join(' and ')}!\`;
}

console.log("\\n" + greet('Hello', 'Alice', 'Bob', 'Charlie'));

// 数组解构中的剩余
const [first, second, ...rest] = [1, 2, 3, 4, 5];
console.log("\\nfirst:", first);
console.log("second:", second);
console.log("rest:", rest);`,
      expectedOutput: '=== 数组展开 ===\n合并: [ 1, 2, 3, 4, 5, 6 ]\n...'
    }
  ],

  // Java 示例（7个）
  java: [
    {
      id: 'java-hello',
      title: 'Hello World',
      description: '基础类和 main 方法',
      code: `// Java Hello World
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        System.out.println("Welcome to Java Online Editor!");
        
        // 基础输出
        String greeting = "Hello, Java!";
        System.out.println(greeting);
    }
}`,
      expectedOutput: 'Hello, World!\nWelcome to Java Online Editor!\nHello, Java!'
    },
    {
      id: 'java-variables',
      title: '变量和类型',
      description: '基本数据类型',
      code: `// Java 变量和类型
public class Main {
    public static void main(String[] args) {
        // 基本数据类型
        int age = 25;
        double height = 1.75;
        boolean isStudent = true;
        char grade = 'A';
        
        System.out.println("Age: " + age);
        System.out.println("Height: " + height + "m");
        System.out.println("Is student: " + isStudent);
        System.out.println("Grade: " + grade);
        
        // 字符串
        String name = "Alice";
        System.out.println("Name: " + name);
        
        // 类型转换
        int num = 10;
        double decimal = num;  // 自动转换
        System.out.println("Int to double: " + decimal);
    }
}`,
      expectedOutput: 'Age: 25\nHeight: 1.75m\n...'
    },
    {
      id: 'java-arrays',
      title: '数组操作',
      description: '数组声明和遍历',
      code: `// Java 数组操作
public class Main {
    public static void main(String[] args) {
        // 声明和初始化数组
        int[] numbers = {1, 2, 3, 4, 5};
        String[] fruits = {"Apple", "Banana", "Orange"};
        
        // 访问数组元素
        System.out.println("First number: " + numbers[0]);
        System.out.println("Array length: " + numbers.length);
        
        // 遍历数组 - for 循环
        System.out.println("\\nTraverse numbers:");
        for (int i = 0; i < numbers.length; i++) {
            System.out.println("numbers[" + i + "] = " + numbers[i]);
        }
        
        // 增强 for 循环
        System.out.println("\\nTraverse fruits:");
        for (String fruit : fruits) {
            System.out.println(fruit);
        }
        
        // 数组求和
        int sum = 0;
        for (int num : numbers) {
            sum += num;
        }
        System.out.println("\\nSum: " + sum);
    }
}`,
      expectedOutput: 'First number: 1\nArray length: 5\n...'
    },
    {
      id: 'java-oop',
      title: '面向对象',
      description: '类和对象',
      code: `// Java 面向对象
class Person {
    String name;
    int age;
    
    // 构造方法
    Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    // 方法
    void introduce() {
        System.out.println("I am " + name + ", " + age + " years old");
    }
    
    void birthday() {
        age++;
        System.out.println(name + " had a birthday! Now " + age + " years old");
    }
}

public class Main {
    public static void main(String[] args) {
        // 创建对象
        Person person1 = new Person("Alice", 25);
        Person person2 = new Person("Bob", 30);
        
        // 调用方法
        person1.introduce();
        person2.introduce();
        
        System.out.println();
        person1.birthday();
    }
}`,
      expectedOutput: 'I am Alice, 25 years old\nI am Bob, 30 years old\n...'
    },
    {
      id: 'java-arraylist',
      title: 'ArrayList',
      description: '动态数组集合',
      code: `// Java ArrayList
import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        // 创建 ArrayList
        ArrayList<String> fruits = new ArrayList<>();
        
        // 添加元素
        fruits.add("Apple");
        fruits.add("Banana");
        fruits.add("Orange");
        System.out.println("Fruits list: " + fruits);
        
        // 访问元素
        System.out.println("First fruit: " + fruits.get(0));
        System.out.println("List size: " + fruits.size());
        
        // 修改元素
        fruits.set(1, "Strawberry");
        System.out.println("\\nAfter modification: " + fruits);
        
        // 删除元素
        fruits.remove(0);
        System.out.println("After removal: " + fruits);
        
        // 遍历
        System.out.println("\\nTraverse list:");
        for (String fruit : fruits) {
            System.out.println("- " + fruit);
        }
        
        // 检查是否包含
        boolean hasOrange = fruits.contains("Orange");
        System.out.println("\\nContains Orange: " + hasOrange);
    }
}`,
      expectedOutput: 'Fruits list: [Apple, Banana, Orange]\n...'
    },
    {
      id: 'java-exception',
      title: '异常处理',
      description: 'try-catch 异常捕获',
      code: `// Java 异常处理
public class Main {
    public static void main(String[] args) {
        // 基本异常处理
        try {
            int result = divide(10, 2);
            System.out.println("10 / 2 = " + result);
            
            // 这会抛出异常
            int error = divide(10, 0);
        } catch (ArithmeticException e) {
            System.out.println("Caught exception: " + e.getMessage());
        } finally {
            System.out.println("Finally block always executes");
        }
        
        // 多个 catch
        System.out.println("\\nArray exception handling:");
        try {
            int[] numbers = {1, 2, 3};
            System.out.println(numbers[5]);  // 越界
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("Array out of bounds: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("Other exception: " + e.getMessage());
        }
        
        System.out.println("\\nProgram continues");
    }
    
    static int divide(int a, int b) {
        return a / b;
    }
}`,
      expectedOutput: '10 / 2 = 5\nCaught exception: / by zero\n...'
    },
    {
      id: 'java-factorial',
      title: '递归算法',
      description: '阶乘计算',
      code: `// Java 递归 - 阶乘
public class Main {
    public static void main(String[] args) {
        // 计算阶乘
        System.out.println("=== Factorial ===");
        for (int i = 1; i <= 10; i++) {
            long result = factorial(i);
            System.out.println(i + "! = " + result);
        }
        
        // 递归求和
        System.out.println("\\n=== Recursive Sum ===");
        int sum = sumToN(100);
        System.out.println("Sum of 1 to 100: " + sum);
        
        // 斐波那契数列
        System.out.println("\\n=== Fibonacci ===");
        for (int i = 0; i < 10; i++) {
            System.out.print(fibonacci(i) + " ");
        }
    }
    
    // 阶乘
    static long factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }
    
    // 递归求和
    static int sumToN(int n) {
        if (n <= 0) {
            return 0;
        }
        return n + sumToN(n - 1);
    }
    
    // 斐波那契
    static int fibonacci(int n) {
        if (n <= 1) {
            return n;
        }
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
}`,
      expectedOutput: '=== Factorial ===\n1! = 1\n2! = 2\n...'
    },
    {
      id: 'java-lambda',
      title: 'Lambda 表达式',
      description: 'Java 8 Lambda',
      code: `// Java Lambda 表达式
import java.util.*;
import java.util.function.*;

public class Main {
    public static void main(String[] args) {
        // 基本 Lambda
        System.out.println("=== 基本 Lambda ===");
        Calculator add = (a, b) -> a + b;
        Calculator multiply = (a, b) -> a * b;
        
        System.out.println("5 + 3 = " + add.calculate(5, 3));
        System.out.println("5 * 3 = " + multiply.calculate(5, 3));
        
        // 列表操作
        System.out.println("\\n=== Lambda 与集合 ===");
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);
        
        // forEach
        System.out.print("Numbers: ");
        numbers.forEach(n -> System.out.print(n + " "));
        System.out.println();
        
        // Predicate - 条件判断
        Predicate<Integer> isEven = n -> n % 2 == 0;
        System.out.println("2 is even? " + isEven.test(2));
        System.out.println("3 is even? " + isEven.test(3));
        
        // Function - 转换
        Function<String, Integer> strLength = s -> s.length();
        System.out.println("\\n'Hello' length: " + strLength.apply("Hello"));
        
        // Consumer - 消费
        Consumer<String> printer = s -> System.out.println(">> " + s);
        System.out.println();
        printer.accept("Lambda Consumer");
        
        // Supplier - 提供
        Supplier<Double> randomSupplier = () -> Math.random();
        System.out.println("\\nRandom: " + randomSupplier.get());
        
        // 方法引用
        System.out.println("\\n=== 方法引用 ===");
        List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
        names.forEach(System.out::println);
    }
}

@FunctionalInterface
interface Calculator {
    int calculate(int a, int b);
}`,
      expectedOutput: '=== 基本 Lambda ===\n5 + 3 = 8\n5 * 3 = 15\n...'
    },
    {
      id: 'java-stream',
      title: 'Stream API',
      description: 'Java 8 Stream 流式处理',
      code: `// Java Stream API
import java.util.*;
import java.util.stream.*;

public class Main {
    public static void main(String[] args) {
        // 创建 Stream
        System.out.println("=== Stream 基础 ===");
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        
        // filter - 筛选偶数
        List<Integer> evens = numbers.stream()
            .filter(n -> n % 2 == 0)
            .collect(Collectors.toList());
        System.out.println("偶数: " + evens);
        
        // map - 转换
        List<Integer> squares = numbers.stream()
            .map(n -> n * n)
            .collect(Collectors.toList());
        System.out.println("平方: " + squares);
        
        // reduce - 聚合
        int sum = numbers.stream()
            .reduce(0, (a, b) -> a + b);
        System.out.println("\\n总和: " + sum);
        
        // 组合操作
        System.out.println("\\n=== 组合操作 ===");
        int result = numbers.stream()
            .filter(n -> n % 2 == 0)  // 筛选偶数
            .map(n -> n * 2)           // 乘以2
            .reduce(0, Integer::sum);  // 求和
        System.out.println("偶数翻倍后的和: " + result);
        
        // 统计
        IntSummaryStatistics stats = numbers.stream()
            .mapToInt(Integer::intValue)
            .summaryStatistics();
        System.out.println("\\n=== 统计信息 ===");
        System.out.println("数量: " + stats.getCount());
        System.out.println("总和: " + stats.getSum());
        System.out.println("平均: " + stats.getAverage());
        System.out.println("最大: " + stats.getMax());
        System.out.println("最小: " + stats.getMin());
        
        // 字符串操作
        System.out.println("\\n=== 字符串 Stream ===");
        List<String> words = Arrays.asList("apple", "banana", "cherry", "date");
        String joined = words.stream()
            .map(String::toUpperCase)
            .collect(Collectors.joining(", "));
        System.out.println("连接: " + joined);
        
        // 分组
        Map<Boolean, List<Integer>> partitioned = numbers.stream()
            .collect(Collectors.partitioningBy(n -> n % 2 == 0));
        System.out.println("\\n偶数组: " + partitioned.get(true));
        System.out.println("奇数组: " + partitioned.get(false));
    }
}`,
      expectedOutput:
        '=== Stream 基础 ===\n偶数: [2, 4, 6, 8, 10]\n平方: [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]\n...'
    }
  ],

  // C++ 示例（7个）
  cpp: [
    {
      id: 'cpp-hello',
      title: 'Hello World',
      description: 'iostream 基础输出',
      code: `// C++ Hello World
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    cout << "欢迎使用 C++ 在线编辑器！" << endl;
    
    // 变量输出
    string greeting = "你好, C++!";
    cout << greeting << endl;
    
    return 0;
}`,
      expectedOutput: 'Hello, World!\n欢迎使用 C++ 在线编辑器!\n...'
    },
    {
      id: 'cpp-variables',
      title: '变量和类型',
      description: '基本类型和输入输出',
      code: `// C++ 变量和类型
#include <iostream>
#include <string>
using namespace std;

int main() {
    // 基本数据类型
    int age = 25;
    double height = 1.75;
    bool isStudent = true;
    char grade = 'A';
    string name = "Alice";
    
    cout << "姓名: " << name << endl;
    cout << "年龄: " << age << endl;
    cout << "身高: " << height << "m" << endl;
    cout << "是学生: " << (isStudent ? "是" : "否") << endl;
    cout << "成绩: " << grade << endl;
    
    // 类型大小
    cout << "\\nint 大小: " << sizeof(int) << " 字节" << endl;
    cout << "double 大小: " << sizeof(double) << " 字节" << endl;
    
    // 类型转换
    int num = 10;
    double decimal = static_cast<double>(num);
    cout << "\\n整数转小数: " << decimal << endl;
    
    return 0;
}`,
      expectedOutput: '姓名: Alice\n年龄: 25\n...'
    },
    {
      id: 'cpp-arrays',
      title: '数组和循环',
      description: '数组遍历操作',
      code: `// C++ 数组和循环
#include <iostream>
using namespace std;

int main() {
    // 数组声明和初始化
    int numbers[] = {1, 2, 3, 4, 5};
    int size = sizeof(numbers) / sizeof(numbers[0]);
    
    cout << "数组大小: " << size << endl;
    cout << "第一个元素: " << numbers[0] << endl;
    
    // for 循环遍历
    cout << "\\n遍历数组:" << endl;
    for (int i = 0; i < size; i++) {
        cout << "numbers[" << i << "] = " << numbers[i] << endl;
    }
    
    // 范围 for 循环 (C++11)
    cout << "\\n范围 for:" << endl;
    for (int num : numbers) {
        cout << num << " ";
    }
    cout << endl;
    
    // 数组求和
    int sum = 0;
    for (int num : numbers) {
        sum += num;
    }
    cout << "\\n总和: " << sum << endl;
    
    // while 循环
    cout << "\\nWhile 循环:" << endl;
    int i = 0;
    while (i < 5) {
        cout << i << " ";
        i++;
    }
    cout << endl;
    
    return 0;
}`,
      expectedOutput: '数组大小: 5\n第一个元素: 1\n...'
    },
    {
      id: 'cpp-functions',
      title: '函数',
      description: '函数定义和调用',
      code: `// C++ 函数
#include <iostream>
using namespace std;

// 函数声明
int add(int a, int b);
int multiply(int a, int b);
void printMessage(string msg);
double calculateArea(double length, double width);

int main() {
    // 调用函数
    int sum = add(5, 3);
    cout << "5 + 3 = " << sum << endl;
    
    int product = multiply(4, 7);
    cout << "4 * 7 = " << product << endl;
    
    double area = calculateArea(10.5, 5.2);
    cout << "矩形面积: " << area << endl;
    
    printMessage("Hello from function!");
    
    return 0;
}

// 函数定义
int add(int a, int b) {
    return a + b;
}

int multiply(int a, int b) {
    return a * b;
}

void printMessage(string msg) {
    cout << "消息: " << msg << endl;
}

double calculateArea(double length, double width) {
    return length * width;
}`,
      expectedOutput: '5 + 3 = 8\n4 * 7 = 28\n...'
    },
    {
      id: 'cpp-pointers',
      title: '指针基础',
      description: '指针使用',
      code: `// C++ 指针基础
#include <iostream>
using namespace std;

int main() {
    // 基本变量
    int num = 42;
    cout << "变量值: " << num << endl;
    cout << "变量地址: " << &num << endl;
    
    // 指针声明和使用
    int* ptr = &num;
    cout << "\\n指针地址: " << ptr << endl;
    cout << "指针指向的值: " << *ptr << endl;
    
    // 通过指针修改值
    *ptr = 100;
    cout << "\\n修改后的 num: " << num << endl;
    
    // 数组和指针
    int arr[] = {10, 20, 30, 40, 50};
    int* arrPtr = arr;
    
    cout << "\\n数组遍历 (指针):" << endl;
    for (int i = 0; i < 5; i++) {
        cout << "*(arrPtr + " << i << ") = " << *(arrPtr + i) << endl;
    }
    
    // 指针算术
    cout << "\\n指针算术:" << endl;
    cout << "arr[0]: " << *arrPtr << endl;
    arrPtr++;
    cout << "arr[1]: " << *arrPtr << endl;
    
    return 0;
}`,
      expectedOutput: '变量值: 42\n变量地址: ...'
    },
    {
      id: 'cpp-vector',
      title: 'Vector 容器',
      description: 'STL 动态数组',
      code: `// C++ Vector
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    // 创建 vector
    vector<int> numbers;
    
    // 添加元素
    numbers.push_back(10);
    numbers.push_back(20);
    numbers.push_back(30);
    
    cout << "Vector 大小: " << numbers.size() << endl;
    
    // 访问元素
    cout << "第一个元素: " << numbers[0] << endl;
    cout << "最后一个元素: " << numbers.back() << endl;
    
    // 遍历
    cout << "\\n遍历 vector:" << endl;
    for (int i = 0; i < numbers.size(); i++) {
        cout << numbers[i] << " ";
    }
    cout << endl;
    
    // 范围 for
    cout << "\\n范围 for:" << endl;
    for (int num : numbers) {
        cout << num << " ";
    }
    cout << endl;
    
    // 插入元素
    numbers.insert(numbers.begin() + 1, 15);
    cout << "\\n插入后: ";
    for (int num : numbers) {
        cout << num << " ";
    }
    cout << endl;
    
    // 排序
    vector<int> unsorted = {64, 34, 25, 12, 22};
    sort(unsorted.begin(), unsorted.end());
    cout << "\\n排序后: ";
    for (int num : unsorted) {
        cout << num << " ";
    }
    cout << endl;
    
    return 0;
}`,
      expectedOutput: 'Vector 大小: 3\n第一个元素: 10\n...'
    },
    {
      id: 'cpp-sort',
      title: '排序',
      description: 'sort 函数使用',
      code: `// C++ 排序
#include <iostream>
#include <algorithm>
#include <vector>
using namespace std;

int main() {
    // 数组排序
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr) / sizeof(arr[0]);
    
    cout << "原始数组: ";
    for (int i = 0; i < n; i++) {
        cout << arr[i] << " ";
    }
    cout << endl;
    
    // 升序排序
    sort(arr, arr + n);
    cout << "升序: ";
    for (int i = 0; i < n; i++) {
        cout << arr[i] << " ";
    }
    cout << endl;
    
    // 降序排序
    sort(arr, arr + n, greater<int>());
    cout << "降序: ";
    for (int i = 0; i < n; i++) {
        cout << arr[i] << " ";
    }
    cout << endl;
    
    // Vector 排序
    vector<int> vec = {5, 2, 8, 1, 9, 3};
    cout << "\\nVector 原始: ";
    for (int num : vec) {
        cout << num << " ";
    }
    cout << endl;
    
    sort(vec.begin(), vec.end());
    cout << "Vector 排序: ";
    for (int num : vec) {
        cout << num << " ";
    }
    cout << endl;
    
    return 0;
}`,
      expectedOutput: '原始数组: 64 34 25 12 22 11 90\n...'
    },
    {
      id: 'cpp-lambda',
      title: 'Lambda 表达式',
      description: 'C++11 Lambda',
      code: `// C++ Lambda 表达式
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    // 基本 Lambda
    cout << "=== 基本 Lambda ===" << endl;
    auto add = [](int a, int b) { return a + b; };
    auto multiply = [](int a, int b) -> int { return a * b; };
    
    cout << "5 + 3 = " << add(5, 3) << endl;
    cout << "5 * 3 = " << multiply(5, 3) << endl;
    
    // Lambda 与容器
    vector<int> numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    
    // for_each
    cout << "\\n=== for_each ===" << endl;
    cout << "Numbers: ";
    for_each(numbers.begin(), numbers.end(), 
             [](int n) { cout << n << " "; });
    cout << endl;
    
    // 捕获外部变量
    int multiplier = 2;
    cout << "\\n=== 捕获变量 ===" << endl;
    for_each(numbers.begin(), numbers.end(),
             [multiplier](int n) { cout << n * multiplier << " "; });
    cout << endl;
    
    // count_if - 计数
    int evenCount = count_if(numbers.begin(), numbers.end(),
                             [](int n) { return n % 2 == 0; });
    cout << "\\n偶数个数: " << evenCount << endl;
    
    // transform - 转换
    vector<int> squares(numbers.size());
    transform(numbers.begin(), numbers.end(), squares.begin(),
              [](int n) { return n * n; });
    
    cout << "\\n平方数: ";
    for (int s : squares) {
        cout << s << " ";
    }
    cout << endl;
    
    return 0;
}`,
      expectedOutput: '=== 基本 Lambda ===\n5 + 3 = 8\n5 * 3 = 15\n...'
    }
  ],

  // C 示例（6个）
  c: [
    {
      id: 'c-hello',
      title: 'Hello World',
      description: 'printf 基础输出',
      code: `// C Hello World
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    printf("欢迎使用 C 语言在线编辑器！\\n");
    
    // 变量输出
    char name[] = "Alice";
    printf("你好, %s!\\n", name);
    
    return 0;
}`,
      expectedOutput: 'Hello, World!\n欢迎使用 C 语言在线编辑器!\n...'
    },
    {
      id: 'c-variables',
      title: '变量和运算',
      description: '基本运算操作',
      code: `// C 变量和运算
#include <stdio.h>

int main() {
    // 基本数据类型
    int age = 25;
    float height = 1.75;
    char grade = 'A';
    
    printf("年龄: %d\\n", age);
    printf("身高: %.2f m\\n", height);
    printf("成绩: %c\\n", grade);
    
    // 算术运算
    int a = 10, b = 3;
    printf("\\n算术运算:\\n");
    printf("%d + %d = %d\\n", a, b, a + b);
    printf("%d - %d = %d\\n", a, b, a - b);
    printf("%d * %d = %d\\n", a, b, a * b);
    printf("%d / %d = %d\\n", a, b, a / b);
    printf("%d %% %d = %d\\n", a, b, a % b);
    
    // 浮点运算
    float x = 10.0, y = 3.0;
    printf("\\n浮点运算:\\n");
    printf("%.1f / %.1f = %.2f\\n", x, y, x / y);
    
    return 0;
}`,
      expectedOutput: '年龄: 25\n身高: 1.75 m\n...'
    },
    {
      id: 'c-arrays',
      title: '数组',
      description: '数组操作',
      code: `// C 数组
#include <stdio.h>

int main() {
    // 数组声明和初始化
    int numbers[] = {1, 2, 3, 4, 5};
    int size = sizeof(numbers) / sizeof(numbers[0]);
    
    printf("数组大小: %d\\n", size);
    printf("第一个元素: %d\\n", numbers[0]);
    
    // 遍历数组
    printf("\\n遍历数组:\\n");
    for (int i = 0; i < size; i++) {
        printf("numbers[%d] = %d\\n", i, numbers[i]);
    }
    
    // 数组求和
    int sum = 0;
    for (int i = 0; i < size; i++) {
        sum += numbers[i];
    }
    printf("\\n总和: %d\\n", sum);
    
    // 查找最大值
    int max = numbers[0];
    for (int i = 1; i < size; i++) {
        if (numbers[i] > max) {
            max = numbers[i];
        }
    }
    printf("最大值: %d\\n", max);
    
    return 0;
}`,
      expectedOutput: '数组大小: 5\n第一个元素: 1\n...'
    },
    {
      id: 'c-functions',
      title: '函数',
      description: '函数定义和调用',
      code: `// C 函数
#include <stdio.h>

// 函数声明
int add(int a, int b);
int multiply(int a, int b);
void printMessage(char* msg);
float calculateArea(float length, float width);

int main() {
    // 调用函数
    int sum = add(5, 3);
    printf("5 + 3 = %d\\n", sum);
    
    int product = multiply(4, 7);
    printf("4 * 7 = %d\\n", product);
    
    float area = calculateArea(10.5, 5.2);
    printf("矩形面积: %.2f\\n", area);
    
    printMessage("Hello from function!");
    
    return 0;
}

// 函数定义
int add(int a, int b) {
    return a + b;
}

int multiply(int a, int b) {
    return a * b;
}

void printMessage(char* msg) {
    printf("消息: %s\\n", msg);
}

float calculateArea(float length, float width) {
    return length * width;
}`,
      expectedOutput: '5 + 3 = 8\n4 * 7 = 28\n...'
    },
    {
      id: 'c-pointers',
      title: '指针',
      description: '指针基础',
      code: `// C 指针
#include <stdio.h>

int main() {
    // 基本变量
    int num = 42;
    printf("变量值: %d\\n", num);
    printf("变量地址: %p\\n", (void*)&num);
    
    // 指针
    int* ptr = &num;
    printf("\\n指针地址: %p\\n", (void*)ptr);
    printf("指针指向的值: %d\\n", *ptr);
    
    // 通过指针修改值
    *ptr = 100;
    printf("\\n修改后的 num: %d\\n", num);
    
    // 数组和指针
    int arr[] = {10, 20, 30, 40, 50};
    int* arrPtr = arr;
    
    printf("\\n数组遍历 (指针):\\n");
    for (int i = 0; i < 5; i++) {
        printf("*(arrPtr + %d) = %d\\n", i, *(arrPtr + i));
    }
    
    // 指针算术
    printf("\\n指针算术:\\n");
    printf("arr[0]: %d\\n", *arrPtr);
    arrPtr++;
    printf("arr[1]: %d\\n", *arrPtr);
    
    return 0;
}`,
      expectedOutput: '变量值: 42\n变量地址: ...'
    },
    {
      id: 'c-struct',
      title: '结构体',
      description: 'struct 使用',
      code: `// C 结构体
#include <stdio.h>
#include <string.h>

// 定义结构体
struct Person {
    char name[50];
    int age;
    float height;
};

int main() {
    // 创建结构体变量
    struct Person person1;
    strcpy(person1.name, "Alice");
    person1.age = 25;
    person1.height = 1.65;
    
    // 输出结构体成员
    printf("=== 个人信息 ===\\n");
    printf("姓名: %s\\n", person1.name);
    printf("年龄: %d\\n", person1.age);
    printf("身高: %.2f m\\n", person1.height);
    
    // 初始化结构体
    struct Person person2 = {"Bob", 30, 1.80};
    printf("\\n=== 另一个人 ===\\n");
    printf("姓名: %s\\n", person2.name);
    printf("年龄: %d\\n", person2.age);
    printf("身高: %.2f m\\n", person2.height);
    
    // 结构体数组
    struct Person people[2] = {
        {"Charlie", 28, 1.75},
        {"Diana", 26, 1.68}
    };
    
    printf("\\n=== 人员列表 ===\\n");
    for (int i = 0; i < 2; i++) {
        printf("%d. %s, %d 岁, %.2f m\\n", 
               i+1, people[i].name, people[i].age, people[i].height);
    }
    
    return 0;
}`,
      expectedOutput: '=== 个人信息 ===\n姓名: Alice\n...'
    }
  ],

  // Go 示例（6个）
  go: [
    {
      id: 'go-hello',
      title: 'Hello World',
      description: 'fmt.Println 输出',
      code: `// Go Hello World
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
    fmt.Println("欢迎使用 Go 在线编辑器！")
    
    // 变量输出
    greeting := "你好, Go!"
    fmt.Println(greeting)
}`,
      expectedOutput: 'Hello, World!\n欢迎使用 Go 在线编辑器!\n...'
    },
    {
      id: 'go-variables',
      title: '变量和类型',
      description: 'var 和类型推断',
      code: `// Go 变量和类型
package main

import "fmt"

func main() {
    // var 声明
    var name string = "Alice"
    var age int = 25
    var height float64 = 1.65
    
    fmt.Println("姓名:", name)
    fmt.Println("年龄:", age)
    fmt.Println("身高:", height, "m")
    
    // 短声明
    city := "北京"
    isStudent := true
    fmt.Println("城市:", city)
    fmt.Println("是学生:", isStudent)
    
    // 多变量声明
    var x, y, z int = 1, 2, 3
    fmt.Println("\\n多变量:", x, y, z)
    
    // 类型推断
    a, b, c := "Hello", 42, 3.14
    fmt.Printf("\\n类型推断: %T, %T, %T\\n", a, b, c)
    fmt.Printf("值: %v, %v, %v\\n", a, b, c)
}`,
      expectedOutput: '姓名: Alice\n年龄: 25\n...'
    },
    {
      id: 'go-slice',
      title: '切片',
      description: 'slice 操作',
      code: `// Go 切片
package main

import "fmt"

func main() {
    // 创建切片
    numbers := []int{1, 2, 3, 4, 5}
    fmt.Println("切片:", numbers)
    fmt.Println("长度:", len(numbers))
    fmt.Println("容量:", cap(numbers))
    
    // 追加元素
    numbers = append(numbers, 6, 7, 8)
    fmt.Println("\\n追加后:", numbers)
    
    // 切片操作
    fmt.Println("\\n切片操作:")
    fmt.Println("前3个:", numbers[:3])
    fmt.Println("从第3个开始:", numbers[3:])
    fmt.Println("中间部分:", numbers[2:5])
    
    // 遍历切片
    fmt.Println("\\n遍历切片:")
    for i, num := range numbers {
        fmt.Printf("索引 %d: %d\\n", i, num)
    }
    
    // make 创建切片
    slice := make([]int, 5, 10)
    fmt.Println("\\nmake 创建:", slice)
    fmt.Println("长度:", len(slice), "容量:", cap(slice))
}`,
      expectedOutput: '切片: [1 2 3 4 5]\n长度: 5\n...'
    },
    {
      id: 'go-functions',
      title: '函数',
      description: '函数和多返回值',
      code: `// Go 函数
package main

import "fmt"

// 基本函数
func add(a, b int) int {
    return a + b
}

// 多返回值
func divmod(a, b int) (int, int) {
    return a / b, a % b
}

// 命名返回值
func calculate(a, b int) (sum int, product int) {
    sum = a + b
    product = a * b
    return  // 直接返回命名变量
}

// 可变参数
func sum(numbers ...int) int {
    total := 0
    for _, num := range numbers {
        total += num
    }
    return total
}

func main() {
    // 调用函数
    result := add(5, 3)
    fmt.Println("5 + 3 =", result)
    
    // 多返回值
    quotient, remainder := divmod(17, 5)
    fmt.Printf("\\n17 / 5 = %d 余 %d\\n", quotient, remainder)
    
    // 命名返回值
    s, p := calculate(4, 5)
    fmt.Printf("\\n4 和 5: 和=%d, 积=%d\\n", s, p)
    
    // 可变参数
    total := sum(1, 2, 3, 4, 5)
    fmt.Println("\\n1+2+3+4+5 =", total)
}`,
      expectedOutput: '5 + 3 = 8\n17 / 5 = 3 余 2\n...'
    },
    {
      id: 'go-struct',
      title: '结构体',
      description: 'struct 定义和使用',
      code: `// Go 结构体
package main

import "fmt"

// 定义结构体
type Person struct {
    Name   string
    Age    int
    Height float64
}

// 结构体方法
func (p Person) Introduce() {
    fmt.Printf("我是 %s, %d 岁, %.2f m\\n", p.Name, p.Age, p.Height)
}

// 指针接收器方法
func (p *Person) Birthday() {
    p.Age++
    fmt.Printf("%s 过生日了！现在 %d 岁\\n", p.Name, p.Age)
}

func main() {
    // 创建结构体
    person1 := Person{
        Name:   "Alice",
        Age:    25,
        Height: 1.65,
    }
    
    // 调用方法
    person1.Introduce()
    person1.Birthday()
    person1.Introduce()
    
    // 简短初始化
    person2 := Person{"Bob", 30, 1.80}
    fmt.Println("\\n另一个人:")
    person2.Introduce()
    
    // 匿名字段
    fmt.Println("\\n结构体信息:")
    fmt.Printf("%+v\\n", person1)
}`,
      expectedOutput: '我是 Alice, 25 岁, 1.65 m\nAlice 过生日了！现在 26 岁\n...'
    },
    {
      id: 'go-goroutine',
      title: '并发',
      description: 'goroutine 基础',
      code: `// Go 并发
package main

import (
    "fmt"
    "time"
)

// 简单的 goroutine
func printNumbers() {
    for i := 1; i <= 5; i++ {
        fmt.Printf("数字: %d\\n", i)
        time.Sleep(100 * time.Millisecond)
    }
}

func printLetters() {
    for i := 'A'; i <= 'E'; i++ {
        fmt.Printf("字母: %c\\n", i)
        time.Sleep(100 * time.Millisecond)
    }
}

// 带参数的 goroutine
func worker(id int) {
    fmt.Printf("Worker %d 开始工作\\n", id)
    time.Sleep(200 * time.Millisecond)
    fmt.Printf("Worker %d 完成工作\\n", id)
}

func main() {
    fmt.Println("=== Goroutine 示例 ===")
    
    // 启动 goroutine
    go printNumbers()
    go printLetters()
    
    // 主 goroutine 等待
    time.Sleep(600 * time.Millisecond)
    
    // 多个 worker
    fmt.Println("\\n=== 多个 Worker ===")
    for i := 1; i <= 3; i++ {
        go worker(i)
    }
    
    // 等待所有 worker 完成
    time.Sleep(500 * time.Millisecond)
    fmt.Println("\\n所有任务完成")
}`,
      expectedOutput: '=== Goroutine 示例 ===\n数字: 1\n字母: A\n...'
    },
    {
      id: 'go-map',
      title: 'Map 映射',
      description: 'map 操作',
      code: `// Go Map
package main

import "fmt"

func main() {
    // 创建 map
    ages := make(map[string]int)
    
    // 添加键值对
    ages["Alice"] = 25
    ages["Bob"] = 30
    ages["Charlie"] = 28
    
    fmt.Println("=== Map 基础 ===")
    fmt.Println("Ages:", ages)
    fmt.Println("Alice:", ages["Alice"])
    
    // 字面量创建
    scores := map[string]int{
        "Math":    95,
        "English": 88,
        "Science": 92,
    }
    fmt.Println("\\nScores:", scores)
    
    // 检查键是否存在
    value, exists := ages["David"]
    if exists {
        fmt.Println("David:", value)
    } else {
        fmt.Println("David 不存在")
    }
    
    // 删除键
    delete(ages, "Bob")
    fmt.Println("\\n删除 Bob 后:", ages)
    
    // 遍历 map
    fmt.Println("\\n=== 遍历 Map ===")
    for name, age := range ages {
        fmt.Printf("%s: %d 岁\\n", name, age)
    }
    
    // 只遍历键
    fmt.Println("\\n所有键:")
    for name := range scores {
        fmt.Printf("- %s\\n", name)
    }
    
    // map 长度
    fmt.Printf("\\nMap 长度: %d\\n", len(ages))
}`,
      expectedOutput: '=== Map 基础 ===\nAges: map[Alice:25 Bob:30 Charlie:28]\n...'
    },
    {
      id: 'go-interface',
      title: '接口',
      description: 'interface 定义和实现',
      code: `// Go 接口
package main

import "fmt"

// 定义接口
type Shape interface {
    Area() float64
    Perimeter() float64
}

// 矩形
type Rectangle struct {
    Width  float64
    Height float64
}

func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

func (r Rectangle) Perimeter() float64 {
    return 2 * (r.Width + r.Height)
}

// 圆形
type Circle struct {
    Radius float64
}

func (c Circle) Area() float64 {
    return 3.14159 * c.Radius * c.Radius
}

func (c Circle) Perimeter() float64 {
    return 2 * 3.14159 * c.Radius
}

// 使用接口的函数
func printShapeInfo(s Shape) {
    fmt.Printf("面积: %.2f, 周长: %.2f\\n", s.Area(), s.Perimeter())
}

func main() {
    // 创建形状
    rect := Rectangle{Width: 10, Height: 5}
    circle := Circle{Radius: 7}
    
    fmt.Println("=== 矩形 ===")
    fmt.Printf("宽: %.0f, 高: %.0f\\n", rect.Width, rect.Height)
    printShapeInfo(rect)
    
    fmt.Println("\\n=== 圆形 ===")
    fmt.Printf("半径: %.0f\\n", circle.Radius)
    printShapeInfo(circle)
    
    // 接口切片
    fmt.Println("\\n=== 多个形状 ===")
    shapes := []Shape{
        Rectangle{Width: 3, Height: 4},
        Circle{Radius: 5},
        Rectangle{Width: 6, Height: 8},
    }
    
    for i, shape := range shapes {
        fmt.Printf("形状 %d: ", i+1)
        printShapeInfo(shape)
    }
}`,
      expectedOutput: '=== 矩形 ===\n宽: 10, 高: 5\n面积: 50.00, 周长: 30.00\n...'
    }
  ],

  // Rust 示例（5个）
  rust: [
    {
      id: 'rust-hello',
      title: 'Hello World',
      description: 'println! 宏输出',
      code: `// Rust Hello World
fn main() {
    println!("Hello, World!");
    println!("欢迎使用 Rust 在线编辑器！");
    
    // 变量输出
    let greeting = "你好, Rust!";
    println!("{}", greeting);
}`,
      expectedOutput: 'Hello, World!\n欢迎使用 Rust 在线编辑器!\n...'
    },
    {
      id: 'rust-variables',
      title: '变量和类型',
      description: '变量绑定和类型',
      code: `// Rust 变量和类型
fn main() {
    // 不可变变量
    let name = "Alice";
    let age = 25;
    let height = 1.65;
    
    println!("姓名: {}", name);
    println!("年龄: {}", age);
    println!("身高: {} m", height);
    
    // 可变变量
    let mut count = 0;
    println!("\\n计数: {}", count);
    count += 1;
    println!("计数: {}", count);
    
    // 类型注解
    let x: i32 = 42;
    let y: f64 = 3.14;
    let is_ready: bool = true;
    
    println!("\\n类型注解:");
    println!("整数: {}", x);
    println!("浮点: {}", y);
    println!("布尔: {}", is_ready);
    
    // 元组
    let tuple = (1, "hello", 3.14);
    println!("\\n元组: {:?}", tuple);
    println!("第一个: {}", tuple.0);
}`,
      expectedOutput: '姓名: Alice\n年龄: 25\n...'
    },
    {
      id: 'rust-ownership',
      title: '所有权',
      description: '所有权基础概念',
      code: `// Rust 所有权
fn main() {
    // 所有权转移
    let s1 = String::from("hello");
    println!("s1: {}", s1);
    
    let s2 = s1;  // s1 的所有权转移给 s2
    println!("s2: {}", s2);
    // println!("s1: {}", s1);  // 错误！s1 已失效
    
    // 克隆
    let s3 = String::from("world");
    let s4 = s3.clone();  // 深拷贝
    println!("\\n克隆:");
    println!("s3: {}", s3);
    println!("s4: {}", s4);
    
    // 引用（借用）
    let s5 = String::from("rust");
    let len = calculate_length(&s5);
    println!("\\n'{}' 的长度是 {}", s5, len);
    
    // 可变引用
    let mut s6 = String::from("hello");
    change(&mut s6);
    println!("修改后: {}", s6);
}

fn calculate_length(s: &String) -> usize {
    s.len()
}

fn change(s: &mut String) {
    s.push_str(", world");
}`,
      expectedOutput: 's1: hello\ns2: hello\n克隆:\ns3: world\n...'
    },
    {
      id: 'rust-functions',
      title: '函数',
      description: '函数定义和使用',
      code: `// Rust 函数
fn main() {
    // 调用函数
    let sum = add(5, 3);
    println!("5 + 3 = {}", sum);
    
    let product = multiply(4, 7);
    println!("4 * 7 = {}", product);
    
    // 返回元组
    let (q, r) = divmod(17, 5);
    println!("\\n17 / 5 = {} 余 {}", q, r);
    
    // 表达式作为返回值
    let result = calculate(10, 20);
    println!("\\n计算结果: {}", result);
    
    // 无返回值函数
    print_message("Hello from Rust!");
}

// 基本函数
fn add(a: i32, b: i32) -> i32 {
    a + b  // 表达式，无分号
}

fn multiply(a: i32, b: i32) -> i32 {
    return a * b;  // 使用 return
}

// 返回元组
fn divmod(a: i32, b: i32) -> (i32, i32) {
    (a / b, a % b)
}

// 表达式函数
fn calculate(x: i32, y: i32) -> i32 {
    let result = x + y;
    result * 2  // 最后的表达式作为返回值
}

// 无返回值
fn print_message(msg: &str) {
    println!("消息: {}", msg);
}`,
      expectedOutput: '5 + 3 = 8\n4 * 7 = 28\n17 / 5 = 3 余 2\n...'
    },
    {
      id: 'rust-vector',
      title: 'Vector',
      description: 'Vec 动态数组',
      code: `// Rust Vector
fn main() {
    // 创建 vector
    let mut numbers = Vec::new();
    
    // 添加元素
    numbers.push(1);
    numbers.push(2);
    numbers.push(3);
    println!("Vector: {:?}", numbers);
    
    // 宏创建
    let mut fruits = vec!["苹果", "香蕉", "橙子"];
    println!("\\n水果: {:?}", fruits);
    
    // 访问元素
    println!("第一个: {}", fruits[0]);
    println!("长度: {}", fruits.len());
    
    // 遍历
    println!("\\n遍历:");
    for fruit in &fruits {
        println!("- {}", fruit);
    }
    
    // 带索引遍历
    println!("\\n带索引:");
    for (i, fruit) in fruits.iter().enumerate() {
        println!("{}. {}", i + 1, fruit);
    }
    
    // 修改元素
    fruits.push("草莓");
    println!("\\n添加后: {:?}", fruits);
    
    // pop 删除
    if let Some(last) = fruits.pop() {
        println!("删除了: {}", last);
    }
    println!("删除后: {:?}", fruits);
    
    // map 转换
    let squares: Vec<i32> = (1..=5).map(|x| x * x).collect();
    println!("\\n平方数: {:?}", squares);
}`,
      expectedOutput: 'Vector: [1, 2, 3]\n水果: ["苹果", "香蕉", "橙子"]\n...'
    }
  ],

  // PHP 示例（6个）
  php: [
    {
      id: 'php-hello',
      title: 'Hello World',
      description: 'echo 基础输出',
      code: `<?php
// PHP Hello World
echo "Hello, World!\\n";
echo "Welcome to PHP Online Editor!\\n";

// Variable output
$greeting = "Hello, PHP!";
echo $greeting . "\\n";
?>`,
      expectedOutput: 'Hello, World!\nWelcome to PHP Online Editor!\nHello, PHP!'
    },
    {
      id: 'php-variables',
      title: '变量和类型',
      description: '$variable, array, 类型转换',
      code: `<?php
// PHP Variables and Types
// Basic variables
$name = "Alice";
$age = 25;
$height = 1.65;
$isStudent = true;

echo "Name: " . $name . "\\n";
echo "Age: " . $age . "\\n";
echo "Height: " . $height . "m\\n";
echo "Is student: " . ($isStudent ? "Yes" : "No") . "\\n";

// Arrays
$fruits = array("Apple", "Banana", "Orange");
echo "\\nFruits: " . implode(", ", $fruits) . "\\n";

// Associative array
$person = array(
    "name" => "Bob",
    "age" => 30,
    "city" => "Beijing"
);
echo "Person: " . $person["name"] . ", " . $person["age"] . " years\\n";
?>`,
      expectedOutput: 'Name: Alice\nAge: 25\n...'
    },
    {
      id: 'php-functions',
      title: '函数',
      description: 'function 定义和调用',
      code: `<?php
// PHP Functions
function add($a, $b) {
    return $a + $b;
}

function greet($name = "Guest") {
    return "Hello, " . $name . "!";
}

function calculate($x, $y) {
    $sum = $x + $y;
    $product = $x * $y;
    return array("sum" => $sum, "product" => $product);
}

// Call functions
echo "5 + 3 = " . add(5, 3) . "\\n";
echo greet("Alice") . "\\n";
echo greet() . "\\n";

$result = calculate(4, 5);
echo "\\nCalculation result:\\n";
echo "Sum: " . $result["sum"] . "\\n";
echo "Product: " . $result["product"] . "\\n";
?>`,
      expectedOutput: '5 + 3 = 8\nHello, Alice!\nHello, Guest!\n...'
    },
    {
      id: 'php-arrays',
      title: '数组操作',
      description: 'array 函数和操作',
      code: `<?php
// PHP Array Operations
$numbers = array(1, 2, 3, 4, 5);

echo "Array: " . implode(", ", $numbers) . "\\n";
echo "Count: " . count($numbers) . "\\n";
echo "First: " . $numbers[0] . "\\n";

// Array functions
echo "\\nArray functions:\\n";
echo "Sum: " . array_sum($numbers) . "\\n";
echo "Max: " . max($numbers) . "\\n";
echo "Min: " . min($numbers) . "\\n";

// Map
$squares = array_map(function($n) {
    return $n * $n;
}, $numbers);
echo "\\nSquares: " . implode(", ", $squares) . "\\n";

// Filter
$evens = array_filter($numbers, function($n) {
    return $n % 2 == 0;
});
echo "Evens: " . implode(", ", $evens) . "\\n";

// Sort
$unsorted = array(64, 34, 25, 12, 22);
sort($unsorted);
echo "\\nSorted: " . implode(", ", $unsorted) . "\\n";
?>`,
      expectedOutput: 'Array: 1, 2, 3, 4, 5\nCount: 5\n...'
    },
    {
      id: 'php-class',
      title: '类和对象',
      description: 'class 定义和方法',
      code: `<?php
// PHP Class and Object
class Person {
    public $name;
    public $age;
    
    // Constructor
    function __construct($name, $age) {
        $this->name = $name;
        $this->age = $age;
    }
    
    // Method
    function introduce() {
        echo "I am {$this->name}, {$this->age} years old\\n";
    }
    
    function birthday() {
        $this->age++;
        echo "{$this->name} had a birthday! Now {$this->age} years old\\n";
    }
}

// Create objects
$person1 = new Person("Alice", 25);
$person2 = new Person("Bob", 30);

// Call methods
$person1->introduce();
$person2->introduce();

echo "\\n";
$person1->birthday();
?>`,
      expectedOutput: 'I am Alice, 25 years old\nI am Bob, 30 years old\n...'
    },
    {
      id: 'php-string',
      title: '字符串操作',
      description: 'string 函数',
      code: `<?php
// PHP String Operations
$text = "  Hello PHP  ";

// Basic operations
echo "Original: '" . $text . "'\\n";
echo "Trim: '" . trim($text) . "'\\n";
echo "Upper: '" . strtoupper($text) . "'\\n";
echo "Lower: '" . strtolower($text) . "'\\n";

// 分割和连接
$sentence = "PHP,JavaScript,Python";
$languages = explode(",", $sentence);
echo "\\nSplit: " . print_r($languages, true);
echo "Join: " . implode(" | ", $languages) . "\\n";

// 搜索和替换
$message = "I love PHP programming";
echo "\\nContains 'PHP': " . (strpos($message, "PHP") !== false ? "Yes" : "No") . "\\n";
echo "Replace: " . str_replace("PHP", "Python", $message) . "\\n";

// Substring
echo "\\nSubstring: " . substr($message, 0, 6) . "\\n";
echo "Length: " . strlen($message) . "\\n";
?>`,
      expectedOutput: "Original: '  Hello PHP  '\nTrim: 'Hello PHP'\n..."
    }
  ],

  // Ruby 示例（5个）
  ruby: [
    {
      id: 'ruby-hello',
      title: 'Hello World',
      description: 'puts 输出',
      code: `# Ruby Hello World
puts "Hello, World!"
puts "Welcome to Ruby Online Editor!"

# Variable output
greeting = "Hello, Ruby!"
puts greeting`,
      expectedOutput: 'Hello, World!\nWelcome to Ruby Online Editor!\nHello, Ruby!'
    },
    {
      id: 'ruby-variables',
      title: '变量和符号',
      description: 'variables, symbols',
      code: `# Ruby Variables and Symbols
# Variables
name = "Alice"
age = 25
height = 1.65

puts "Name: #{name}"
puts "Age: #{age}"
puts "Height: #{height}m"

# Symbols
status = :active
role = :admin
puts "\\nStatus: #{status}"
puts "Role: #{role}"

# Constants
PI = 3.14159
puts "\\nPI: #{PI}"

# Multiple assignment
x, y, z = 1, 2, 3
puts "\\nMultiple: #{x}, #{y}, #{z}"`,
      expectedOutput: 'Name: Alice\nAge: 25\n...'
    },
    {
      id: 'ruby-arrays',
      title: '数组和哈希',
      description: 'Array, Hash 操作',
      code: `# Ruby Arrays and Hashes
# Array
fruits = ["Apple", "Banana", "Orange"]
puts "Fruits: #{fruits.inspect}"
puts "First: #{fruits[0]}"
puts "Length: #{fruits.length}"

# Array methods
fruits.push("Grape")
puts "\\nAfter push: #{fruits.inspect}"

fruits.each do |fruit|
  puts "- #{fruit}"
end

# Hash
person = {
  name: "Bob",
  age: 30,
  city: "Beijing"
}
puts "\\nPerson: #{person.inspect}"
puts "Name: #{person[:name]}"

# Iterate hash
puts "\\nIterate hash:"
person.each do |key, value|
  puts "#{key}: #{value}"
end`,
      expectedOutput: 'Fruits: ["Apple", "Banana", "Orange"]\n...'
    },
    {
      id: 'ruby-methods',
      title: '方法',
      description: 'def 方法定义',
      code: `# Ruby Methods
def add(a, b)
  a + b
end

def multiply(a, b)
  a * b
end

def greet(name = "Guest")
  "Hello, #{name}!"
end

# Call methods
puts "5 + 3 = #{add(5, 3)}"
puts "4 * 7 = #{multiply(4, 7)}"
puts greet("Alice")
puts greet

# Method with block
def repeat(times)
  times.times do |i|
    yield i
  end
end

puts "\\nRepeat:"
repeat(5) do |i|
  puts "Number #{i}"
end`,
      expectedOutput: '5 + 3 = 8\n4 * 7 = 28\nHello, Alice!\nHello, Guest!\n...'
    },
    {
      id: 'ruby-class',
      title: '类',
      description: 'class 定义',
      code: `# Ruby Class
class Person
  attr_accessor :name, :age
  
  def initialize(name, age)
    @name = name
    @age = age
  end
  
  def introduce
    puts "I am #{@name}, #{@age} years old"
  end
  
  def birthday
    @age += 1
    puts "#{@name} had a birthday! Now #{@age} years old"
  end
end

# Create objects
person1 = Person.new("Alice", 25)
person2 = Person.new("Bob", 30)

# Call methods
person1.introduce
person2.introduce

puts ""
person1.birthday`,
      expectedOutput: 'I am Alice, 25 years old\nI am Bob, 30 years old\n...'
    }
  ],

  // Swift 示例（5个）
  swift: [
    {
      id: 'swift-hello',
      title: 'Hello World',
      description: 'print 输出',
      code: `// Swift Hello World
print("Hello, World!")
print("Welcome to Swift Online Editor!")

// Variable output
let greeting = "Hello, Swift!"
print(greeting)`,
      expectedOutput: 'Hello, World!\nWelcome to Swift Online Editor!\nHello, Swift!'
    },
    {
      id: 'swift-variables',
      title: '变量和常量',
      description: 'var, let 声明',
      code: `// Swift Variables and Constants
// Constants (let)
let name = "Alice"
let age = 25
let height = 1.65

print("Name: \\(name)")
print("Age: \\(age)")
print("Height: \\(height)m")

// Variables (var)
var count = 0
print("\\nCount: \\(count)")
count += 1
print("Count: \\(count)")

// Type annotations
let city: String = "Beijing"
let score: Int = 95
let gpa: Double = 3.85

print("\\nCity: \\(city), Score: \\(score), GPA: \\(gpa)")`,
      expectedOutput: 'Name: Alice\nAge: 25\n...'
    },
    {
      id: 'swift-optional',
      title: '可选类型',
      description: 'Optional 类型',
      code: `// Swift Optional
// Optional declaration
var name: String? = "Alice"
var age: Int? = nil

// Unwrapping
if let unwrappedName = name {
    print("Name: \\(unwrappedName)")
} else {
    print("Name is nil")
}

if let unwrappedAge = age {
    print("Age: \\(unwrappedAge)")
} else {
    print("Age is nil")
}

// Force unwrapping (careful!)
name = "Bob"
print("\\nForce unwrap: \\(name!)")

// Nil coalescing
let defaultName = age ?? 0
print("Default age: \\(defaultName)")

// Optional chaining
struct Person {
    var name: String
    var age: Int?
}

let person: Person? = Person(name: "Charlie", age: 28)
print("\\nPerson age: \\(person?.age ?? 0)")`,
      expectedOutput: 'Name: Alice\nAge is nil\n...'
    },
    {
      id: 'swift-arrays',
      title: '数组和字典',
      description: 'Array, Dictionary',
      code: `// Swift Arrays and Dictionaries
// Array
var fruits = ["Apple", "Banana", "Orange"]
print("Fruits: \\(fruits)")
print("First: \\(fruits[0])")
print("Count: \\(fruits.count)")

// Array operations
fruits.append("Grape")
print("\\nAfter append: \\(fruits)")

for (index, fruit) in fruits.enumerated() {
    print("\\(index + 1). \\(fruit)")
}

// Dictionary
var person = [
    "name": "Bob",
    "age": "30",
    "city": "Beijing"
]
print("\\nPerson: \\(person)")
print("Name: \\(person["name"]!)")

// Iterate dictionary
print("\\nIterate:")
for (key, value) in person {
    print("\\(key): \\(value)")
}`,
      expectedOutput: 'Fruits: ["Apple", "Banana", "Orange"]\n...'
    },
    {
      id: 'swift-functions',
      title: '函数和闭包',
      description: 'func, closure',
      code: `// Swift Functions and Closures
// Basic function
func add(a: Int, b: Int) -> Int {
    return a + b
}

func greet(name: String = "Guest") -> String {
    return "Hello, \\(name)!"
}

print("5 + 3 = \\(add(a: 5, b: 3))")
print(greet(name: "Alice"))
print(greet())

// 多返回值函数
func calculate(a: Int, b: Int) -> (sum: Int, product: Int) {
    return (a + b, a * b)
}

let result = calculate(a: 4, b: 5)
print("\\nSum: \\(result.sum), Product: \\(result.product)")

// Closure
let multiply = { (a: Int, b: Int) -> Int in
    return a * b
}
print("\\nClosure: 4 * 7 = \\(multiply(4, 7))")

// Shorthand
let numbers = [1, 2, 3, 4, 5]
let doubled = numbers.map { $0 * 2 }
print("Doubled: \\(doubled)")`,
      expectedOutput: '5 + 3 = 8\nHello, Alice!\nHello, Guest!\n...'
    }
  ],

  // Bash 示例（4个）
  bash: [
    {
      id: 'bash-hello',
      title: 'Hello World',
      description: 'echo 输出',
      code: `#!/bin/bash
# Bash Hello World
echo "Hello, World!"
echo "Welcome to Bash!"

# Variable
greeting="Hello, Bash!"
echo "$greeting"`,
      expectedOutput: 'Hello, World!\nWelcome to Bash!\nHello, Bash!'
    },
    {
      id: 'bash-variables',
      title: '变量',
      description: '变量定义和使用',
      code: `#!/bin/bash
# Bash Variables
name="Alice"
age=25
city="Beijing"

echo "Name: $name"
echo "Age: $age"
echo "City: $city"

# Command substitution
current_date=$(date +%Y-%m-%d)
echo "Date: $current_date"

# Arithmetic
a=10
b=3
sum=$((a + b))
product=$((a * b))

echo ""
echo "$a + $b = $sum"
echo "$a * $b = $product"`,
      expectedOutput: 'Name: Alice\nAge: 25\n...'
    },
    {
      id: 'bash-control',
      title: '条件和循环',
      description: 'if, for, while',
      code: `#!/bin/bash
# Bash Control Structures
# If statement
score=85

if [ $score -ge 90 ]; then
    echo "Grade: A"
elif [ $score -ge 80 ]; then
    echo "Grade: B"
elif [ $score -ge 70 ]; then
    echo "Grade: C"
else
    echo "Grade: F"
fi

# For loop
echo ""
echo "For loop:"
for i in 1 2 3 4 5; do
    echo "Number: $i"
done

# C-style for
echo ""
echo "C-style for:"
for ((i=1; i<=5; i++)); do
    echo "Count: $i"
done

# While loop
echo ""
echo "While loop:"
counter=1
while [ $counter -le 3 ]; do
    echo "Counter: $counter"
    ((counter++))
done`,
      expectedOutput: 'Grade: B\nFor loop:\nNumber: 1\n...'
    },
    {
      id: 'bash-functions',
      title: '函数',
      description: 'function 定义',
      code: `#!/bin/bash
# Bash Functions
function greet() {
    echo "Hello, $1!"
}

function add() {
    local result=$(($1 + $2))
    echo $result
}

function info() {
    echo "Name: $1"
    echo "Age: $2"
    echo "City: \${3:-Beijing}"  # Default value
}

# Call functions
greet "Alice"
greet "Bob"

echo ""
sum=$(add 5 3)
echo "5 + 3 = $sum"

echo ""
info "Charlie" 28
info "Diana" 26 "Shanghai"`,
      expectedOutput: 'Hello, Alice!\nHello, Bob!\n5 + 3 = 8\n...'
    }
  ],

  // Lua 示例（4个）
  lua: [
    {
      id: 'lua-hello',
      title: 'Hello World',
      description: 'print 输出',
      code: `-- Lua Hello World
print("Hello, World!")
print("Welcome to Lua Online Editor!")

-- Variable output
local greeting = "Hello, Lua!"
print(greeting)`,
      expectedOutput: 'Hello, World!\nWelcome to Lua Online Editor!\nHello, Lua!'
    },
    {
      id: 'lua-variables',
      title: '变量和表',
      description: 'variables, tables',
      code: `-- Lua Variables and Tables
-- Variables
local name = "Alice"
local age = 25
local height = 1.65

print("Name: " .. name)
print("Age: " .. age)
print("Height: " .. height .. "m")

-- Tables (arrays)
local fruits = {"Apple", "Banana", "Orange"}
print("\\nFruits:")
for i, fruit in ipairs(fruits) do
    print(i .. ". " .. fruit)
end

-- Tables (dictionaries)
local person = {
    name = "Bob",
    age = 30,
    city = "Beijing"
}
print("\\nPerson name: " .. person.name)
print("Person age: " .. person.age)`,
      expectedOutput: 'Name: Alice\nAge: 25\n...'
    },
    {
      id: 'lua-functions',
      title: '函数',
      description: 'function 定义',
      code: `-- Lua Functions
function add(a, b)
    return a + b
end

function multiply(a, b)
    return a * b
end

function greet(name)
    name = name or "Guest"  -- Default value
    return "Hello, " .. name .. "!"
end

-- Multiple return values
function divmod(a, b)
    return math.floor(a / b), a % b
end

-- Call functions
print("5 + 3 = " .. add(5, 3))
print("4 * 7 = " .. multiply(4, 7))
print(greet("Alice"))
print(greet())

local quotient, remainder = divmod(17, 5)
print("\\n17 / 5 = " .. quotient .. " remainder " .. remainder)`,
      expectedOutput: '5 + 3 = 8\n4 * 7 = 28\n...'
    },
    {
      id: 'lua-metatable',
      title: '元表',
      description: 'metatable 基础',
      code: `-- Lua Metatable
-- Create table
local vector = {x = 10, y = 20}

-- Define metatable
local mt = {
    __add = function(a, b)
        return {x = a.x + b.x, y = a.y + b.y}
    end,
    __tostring = function(v)
        return "(" .. v.x .. ", " .. v.y .. ")"
    end
}

-- Set metatable
setmetatable(vector, mt)

local vector2 = {x = 5, y = 10}
setmetatable(vector2, mt)

-- Use metatable
print("Vector 1: " .. tostring(vector))
print("Vector 2: " .. tostring(vector2))

local sum = vector + vector2
setmetatable(sum, mt)
print("\\nSum: " .. tostring(sum))

-- Access metatable
print("\\nHas metatable: " .. tostring(getmetatable(vector) ~= nil))`,
      expectedOutput: 'Vector 1: (10, 20)\nVector 2: (5, 10)\nSum: (15, 30)\n...'
    }
  ],

  // Scala 示例（5个）
  scala: [
    {
      id: 'scala-hello',
      title: 'Hello World',
      description: 'println 输出',
      code: `// Scala Hello World
object Main extends App {
  println("Hello, World!")
  println("Welcome to Scala!")
  
  val greeting = "Hello, Scala!"
  println(greeting)
}`,
      expectedOutput: 'Hello, World!\nWelcome to Scala!\nHello, Scala!'
    },
    {
      id: 'scala-variables',
      title: '变量和类型',
      description: 'val, var 声明',
      code: `// Scala Variables and Types
object Main extends App {
  // Immutable (val)
  val name = "Alice"
  val age = 25
  val height = 1.65
  
  println(s"Name: $name")
  println(s"Age: $age")
  println(s"Height: \${height}m")
  
  // Mutable (var)
  var count = 0
  println(s"\\nCount: $count")
  count += 1
  println(s"Count: $count")
  
  // Type annotations
  val city: String = "Beijing"
  val score: Int = 95
  val gpa: Double = 3.85
  
  println(s"\\nCity: $city, Score: $score, GPA: $gpa")
}`,
      expectedOutput: 'Name: Alice\nAge: 25\n...'
    },
    {
      id: 'scala-collections',
      title: '集合',
      description: 'List, Map 操作',
      code: `// Scala Collections
object Main extends App {
  // List (immutable)
  val fruits = List("Apple", "Banana", "Orange")
  println(s"Fruits: $fruits")
  println(s"First: \${fruits.head}")
  println(s"Size: \${fruits.size}")
  
  // List operations
  val numbers = List(1, 2, 3, 4, 5)
  val squares = numbers.map(n => n * n)
  println(s"\\nSquares: $squares")
  
  val evens = numbers.filter(_ % 2 == 0)
  println(s"Evens: $evens")
  
  val sum = numbers.reduce(_ + _)
  println(s"Sum: $sum")
  
  // Map
  val person = Map(
    "name" -> "Bob",
    "age" -> 30
  )
  println(s"\\nPerson: $person")
  println(s"Name: \${person(\"name\")}")
}`,
      expectedOutput: 'Fruits: List(Apple, Banana, Orange)\n...'
    },
    {
      id: 'scala-functions',
      title: '函数',
      description: 'def, 高阶函数',
      code: `// Scala Functions
object Main extends App {
  // Basic function
  def add(a: Int, b: Int): Int = {
    a + b
  }
  
  // Single expression
  def multiply(a: Int, b: Int) = a * b
  
  // Default parameters
  def greet(name: String = "Guest"): String = {
    s"Hello, $name!"
  }
  
  println(s"5 + 3 = \${add(5, 3)}")
  println(s"4 * 7 = \${multiply(4, 7)}")
  println(greet("Alice"))
  println(greet())
  
  // Higher-order functions
  def applyOperation(a: Int, b: Int, op: (Int, Int) => Int): Int = {
    op(a, b)
  }
  
  println(s"\\nHigher-order: \${applyOperation(10, 5, add)}")
  println(s"Anonymous: \${applyOperation(10, 5, (x, y) => x - y)}")
}`,
      expectedOutput: '5 + 3 = 8\n4 * 7 = 28\n...'
    },
    {
      id: 'scala-match',
      title: '模式匹配',
      description: 'match case',
      code: `// Scala Pattern Matching
object Main extends App {
  // Basic match
  def describe(x: Any): String = x match {
    case 0 => "zero"
    case 1 => "one"
    case _: String => "a string"
    case _: Int => "an integer"
    case _ => "something else"
  }
  
  println(describe(0))
  println(describe(1))
  println(describe("hello"))
  println(describe(42))
  
  // 条件匹配
  def grade(score: Int): String = score match {
    case s if s >= 90 => "A"
    case s if s >= 80 => "B"
    case s if s >= 70 => "C"
    case s if s >= 60 => "D"
    case _ => "F"
  }
  
  println(s"\\nGrade for 85: \${grade(85)}")
  println(s"\\nGrade for 92: \${grade(92)}")
  
  // List matching
  val numbers = List(1, 2, 3)
  numbers match {
    case List(1, _, _) => println("\\nStarts with 1")
    case _ => println("\\nOther pattern")
  }
}`,
      expectedOutput: 'zero\none\na string\nan integer\n...'
    }
  ],

  // Haskell 示例（4个）
  haskell: [
    {
      id: 'haskell-hello',
      title: 'Hello World',
      description: 'putStrLn 输出',
      code: `-- Haskell Hello World
main :: IO ()
main = do
    putStrLn "Hello, World!"
    putStrLn "Welcome to Haskell!"
    let greeting = "Hello, Haskell!"
    putStrLn greeting`,
      expectedOutput: 'Hello, World!\nWelcome to Haskell!\nHello, Haskell!'
    },
    {
      id: 'haskell-functions',
      title: '函数定义',
      description: '函数和类型签名',
      code: `-- Haskell Functions
-- Function with type signature
add :: Int -> Int -> Int
add a b = a + b

multiply :: Int -> Int -> Int
multiply a b = a * b

-- Pattern matching
factorial :: Int -> Int
factorial 0 = 1
factorial n = n * factorial (n - 1)

main :: IO ()
main = do
    putStrLn $ "5 + 3 = " ++ show (add 5 3)
    putStrLn $ "4 * 7 = " ++ show (multiply 4 7)
    putStrLn ""
    putStrLn "Factorials:"
    putStrLn $ "5! = " ++ show (factorial 5)
    putStrLn $ "10! = " ++ show (factorial 10)`,
      expectedOutput: '5 + 3 = 8\n4 * 7 = 28\nFactorials:\n5! = 120\n10! = 3628800'
    },
    {
      id: 'haskell-lists',
      title: '列表操作',
      description: 'list comprehension',
      code: `-- Haskell Lists
main :: IO ()
main = do
    -- Basic list
    let numbers = [1..10]
    putStrLn $ "Numbers: " ++ show numbers
    
    -- List comprehension
    let squares = [x * x | x <- [1..5]]
    putStrLn $ "Squares: " ++ show squares
    
    let evens = [x | x <- numbers, x \`mod\` 2 == 0]
    putStrLn $ "Evens: " ++ show evens
    
    -- List operations
    let fruits = ["Apple", "Banana", "Orange"]
    putStrLn $ "\\nFirst: " ++ head fruits
    putStrLn $ "Last: " ++ last fruits
    putStrLn $ "Length: " ++ show (length fruits)
    
    -- Map and filter
    let doubled = map (*2) numbers
    putStrLn $ "\\nDoubled: " ++ show doubled`,
      expectedOutput: 'Numbers: [1,2,3,4,5,6,7,8,9,10]\nSquares: [1,4,9,16,25]\n...'
    },
    {
      id: 'haskell-recursion',
      title: '递归',
      description: '递归函数',
      code: `-- Haskell Recursion
-- Fibonacci
fibonacci :: Int -> Int
fibonacci 0 = 0
fibonacci 1 = 1
fibonacci n = fibonacci (n - 1) + fibonacci (n - 2)

-- Sum of list
sumList :: [Int] -> Int
sumList [] = 0
sumList (x:xs) = x + sumList xs

-- Length of list
lengthList :: [a] -> Int
lengthList [] = 0
lengthList (_:xs) = 1 + lengthList xs

main :: IO ()
main = do
    putStrLn "Fibonacci sequence:"
    putStrLn $ show [fibonacci n | n <- [0..9]]
    
    let numbers = [1..10]
    putStrLn $ "\\nSum of " ++ show numbers ++ " = " ++ show (sumList numbers)
    putStrLn $ "Length: " ++ show (lengthList numbers)`,
      expectedOutput: 'Fibonacci sequence:\n[0,1,1,2,3,5,8,13,21,34]\n...'
    }
  ],

  // Perl 示例（4个）
  perl: [
    {
      id: 'perl-hello',
      title: 'Hello World',
      description: 'print 输出',
      code: `# Perl Hello World
print "Hello, World!\\n";
print "Welcome to Perl!\\n";

# Variable
my $greeting = "Hello, Perl!";
print "$greeting\\n";`,
      expectedOutput: 'Hello, World!\nWelcome to Perl!\nHello, Perl!'
    },
    {
      id: 'perl-variables',
      title: '变量',
      description: 'scalar, array, hash',
      code: `# Perl Variables
# Scalar variables
my $name = "Alice";
my $age = 25;
my $height = 1.65;

print "Name: $name\\n";
print "Age: $age\\n";
print "Height: \${height}m\\n";

# Arrays
my @fruits = ("Apple", "Banana", "Orange");
print "\\nFruits: @fruits\\n";
print "First: $fruits[0]\\n";
print "Count: " . scalar(@fruits) . "\\n";

# Hash
my %person = (
    name => "Bob",
    age => 30,
    city => "Beijing"
);
print "\\nPerson name: $person{name}\\n";
print "Person age: $person{age}\\n";`,
      expectedOutput: 'Name: Alice\nAge: 25\n...'
    },
    {
      id: 'perl-regex',
      title: '正则表达式',
      description: 'regex 匹配和替换',
      code: `# Perl Regular Expressions
my $text = "Hello World 123";

# Pattern matching
if ($text =~ /World/) {
    print "Contains 'World'\\n";
}

if ($text =~ /(\\d+)/) {
    print "Found number: $1\\n";
}

# Substitution
my $replaced = $text;
$replaced =~ s/World/Perl/;
print "\\nReplaced: $replaced\\n";

# Global replacement
my $sentence = "foo bar foo baz foo";
$sentence =~ s/foo/qux/g;
print "Global replace: $sentence\\n";

# Case insensitive
my $word = "HELLO";
if ($word =~ /hello/i) {
    print "\\nCase insensitive match!\\n";
}

# Extract all numbers
my $data = "abc123def456ghi789";
my @numbers = $data =~ /(\\d+)/g;
print "Numbers: @numbers\\n";`,
      expectedOutput: "Contains 'World'\nFound number: 123\n..."
    },
    {
      id: 'perl-arrays',
      title: '数组操作',
      description: 'array 函数',
      code: `# Perl Array Operations
my @numbers = (1, 2, 3, 4, 5);

print "Array: @numbers\\n";
print "First: $numbers[0]\\n";
print "Last: $numbers[-1]\\n";
print "Length: " . scalar(@numbers) . "\\n";

# Push and pop
push @numbers, 6, 7;
print "\\nAfter push: @numbers\\n";

my $last = pop @numbers;
print "Popped: $last\\n";
print "After pop: @numbers\\n";

# Shift and unshift
my $first = shift @numbers;
print "\\nShifted: $first\\n";

unshift @numbers, 0;
print "After unshift: @numbers\\n";

# Iterate
print "\\nIterate:\\n";
foreach my $num (@numbers) {
    print "- $num\\n";
}

# Sort
my @unsorted = (5, 2, 8, 1, 9);
my @sorted = sort { $a <=> $b } @unsorted;
print "\\nSorted: @sorted\\n";`,
      expectedOutput: 'Array: 1 2 3 4 5\nFirst: 1\n...'
    }
  ]
}

export default codeExamples
