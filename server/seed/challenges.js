// ============================================================
//  Starter challenges. Each one hides 1-3 bugs.
//  Run `npm run seed` to put them into the database.
//
//  Tip: test cases are written as normal JS values here and turned
//  into JSON strings by the seed script, so they're easy to edit.
// ============================================================

const challenges = [
  {
    title: 'Upside-Down Sort',
    difficulty: 'easy',
    functionName: 'sortNumbers',
    description:
      'sortNumbers(arr) should return a NEW array with the numbers sorted from smallest to largest. ' +
      'The original array must not be changed.',
    buggyCode: `function sortNumbers(arr) {
  const result = [...arr];

  // Bubble sort: keep swapping neighbours that are in the wrong order
  for (let i = 0; i < result.length; i++) {
    for (let j = 0; j < result.length - i - 1; j++) {
      if (result[j] < result[j + 1]) {
        const temp = result[j];
        result[j] = result[j + 1];
        result[j + 1] = temp;
      }
    }
  }

  return result;
}`,
    tests: [
      { args: [[3, 1, 2]], expected: [1, 2, 3] },
      { args: [[5, -2, 9, 0]], expected: [-2, 0, 5, 9] },
      { args: [[10, 2, 33, 4]], expected: [2, 4, 10, 33] },
      { args: [[1]], expected: [1] },
      { args: [[]], expected: [] },
    ],
  },
  {
    title: 'Even Steven',
    difficulty: 'easy',
    functionName: 'sumEvens',
    description: 'sumEvens(nums) should return the sum of all EVEN numbers in the array (including negative ones).',
    buggyCode: `function sumEvens(nums) {
  let sum = 0;

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] % 2 === 1) {
      sum += nums[i];
    }
  }

  return sum;
}`,
    tests: [
      { args: [[1, 2, 3, 4]], expected: 6 },
      { args: [[2, 4, 6]], expected: 12 },
      { args: [[1, 3, 5]], expected: 0 },
      { args: [[-2, 3, 8]], expected: 6 },
      { args: [[]], expected: 0 },
    ],
  },
  {
    title: 'Mirror Mirror',
    difficulty: 'medium',
    functionName: 'isPalindrome',
    description:
      'isPalindrome(str) should return true if the text reads the same forwards and backwards, ' +
      'ignoring case, spaces and punctuation.',
    buggyCode: `function isPalindrome(str) {
  // Keep only letters and digits, all lowercase
  const clean = str.toLowerCase().replace(/[^a-z0-9]/, '');

  let left = 0;
  let right = clean.length;

  while (left < right) {
    if (clean[left] !== clean[right]) {
      return false;
    }
    left++;
    right--;
  }

  return true;
}`,
    tests: [
      { args: ['racecar'], expected: true },
      { args: ['A man, a plan, a canal: Panama'], expected: true },
      { args: ['hello'], expected: false },
      { args: ['No lemon, no melon'], expected: true },
      { args: [''], expected: true },
    ],
  },
  {
    title: 'FizzBuzz Fumble',
    difficulty: 'medium',
    functionName: 'fizzBuzz',
    description:
      'fizzBuzz(n) should return an array of STRINGS for every number from 1 to n (inclusive): ' +
      '"Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for multiples of both, ' +
      'otherwise the number itself as a string.',
    buggyCode: `function fizzBuzz(n) {
  const out = [];

  for (let i = 1; i < n; i++) {
    if (i % 3 === 0) {
      out.push('Fizz');
    } else if (i % 5 === 0) {
      out.push('Buzz');
    } else if (i % 15 === 0) {
      out.push('FizzBuzz');
    } else {
      out.push(i);
    }
  }

  return out;
}`,
    tests: [
      { args: [1], expected: ['1'] },
      { args: [3], expected: ['1', '2', 'Fizz'] },
      { args: [5], expected: ['1', '2', 'Fizz', '4', 'Buzz'] },
      {
        args: [15],
        expected: ['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz'],
      },
      { args: [0], expected: [] },
    ],
  },
  {
    title: 'Lost in the Middle',
    difficulty: 'hard',
    functionName: 'binarySearch',
    description:
      'binarySearch(arr, target) gets a SORTED array and should return the index of target, ' +
      'or -1 if it is not there. Careful: the buggy version can loop forever!',
    buggyCode: `function binarySearch(arr, target) {
  let low = 0;
  let high = arr.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);

    if (arr[mid] === target) {
      return mid;
    }

    if (arr[mid] < target) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}`,
    tests: [
      { args: [[1, 3, 5, 7, 9], 7], expected: 3 },
      { args: [[1, 3, 5, 7, 9], 1], expected: 0 },
      { args: [[1, 3, 5, 7, 9], 9], expected: 4 },
      { args: [[1, 3, 5, 7, 9], 4], expected: -1 },
      { args: [[2], 2], expected: 0 },
      { args: [[], 5], expected: -1 },
    ],
  },
];

export default challenges;
