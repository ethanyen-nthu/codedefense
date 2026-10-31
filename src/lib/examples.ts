export const EXAMPLES = [
  {
    name: 'Armstrong number',
    code: `#include <iostream>
using namespace std;
int main() {
    int number;
    if (!(cin >> number) || number < 100 || number > 999) return 1;
    int temp = number;
    int sum = 0;
    while (temp > 0) {
        int digit = temp % 10;
        sum += digit * digit * digit;
        temp /= 10;
    }
    if (sum == number) cout << "Armstrong";
    else cout << "Not Armstrong";
    return 0;
}`,
  },
  {
    name: 'Switch calculator',
    code: `#include <iostream>
using namespace std;
int main() {
    int a, b;
    char op;
    if (!(cin >> a >> op >> b) || a < -100 || a > 100 || b < -100 || b > 100) return 1;
    switch (op) {
        case '+': cout << a + b; break;
        case '-': cout << a - b; break;
        case '*': cout << a * b; break;
        default: cout << "Unsupported operator";
    }
    return 0;
}`,
  },
  {
    name: 'Recursive factorial',
    code: `#include <iostream>
using namespace std;
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}
int main() {
    int n;
    if (!(cin >> n) || n < 0 || n > 7) return 1;
    cout << factorial(n) << endl;
    return 0;
}`,
  },
  {
    name: 'Digit sum',
    code: `#include <iostream>
int main() {
    int number;
    if (!(std::cin >> number) || number < 0 || number > 30000) return 1;
    int sum = 0;
    while (number > 0) {
        sum += number % 10;
        number /= 10;
    }
    std::cout << sum;
    return 0;
}`,
  },
  {
    name: 'Palindrome',
    code: `#include <iostream>
int main() {
    int number;
    if (!(std::cin >> number) || number < 0 || number > 999) return 1;
    int original = number;
    int reversed = 0;
    while (number > 0) {
        reversed = reversed * 10 + number % 10;
        number /= 10;
    }
    std::cout << (original == reversed);
    return 0;
}`,
  },
  {
    name: 'Array total',
    code: `#include <iostream>
int total(const int values[], int count) {
    int sum = 0;
    for (int i = 0; i < count; ++i) sum += values[i];
    return sum;
}
int main() {
    int values[4] = {2, 4, 6, 8};
    std::cout << total(values, 4);
    return 0;
}`,
  },
];
