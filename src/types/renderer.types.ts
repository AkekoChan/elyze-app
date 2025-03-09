export type TimerType = {
  time: string;
  rest: number;
};

export type GoalType = {
  label: string;
  time: number;
};

export type NotificationType = {
  title: string;
  icon: string;
  body: string;
  soundPlayed: boolean;
};

export type GoalProgressType = { date: string; progress: number };

export type WorkRestType =
  | {
      work1: number;
      rest1?: undefined;
      work2?: undefined;
      rest2?: undefined;
      work3?: undefined;
    }
  | {
      work1: number;
      rest1: number;
      work2: number;
      rest2?: undefined;
      work3?: undefined;
    }
  | {
      work1: number;
      rest1: number;
      work2: number;
      rest2: number;
      work3: number;
    };

export type LetterType = {
  name: string;
  letter: string;
};
