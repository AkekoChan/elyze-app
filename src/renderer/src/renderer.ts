import {
  GoalProgressType,
  GoalType,
  LetterType,
  NotificationType,
  TimerType,
  WorkRestType,
} from '../../types/renderer.types';

document.addEventListener('DOMContentLoaded', () => {
  const App = {
    // Les constantes
    countTimer: 0,
    timer: [
      { time: '25 min', rest: 0 },
      { time: '65 min', rest: 1 },
      { time: '90 min', rest: 2 },
    ] as TimerType[],
    sessions: [
      { work1: 25 },
      { work1: 27, rest1: 5, work2: 27 },
      { work1: 26, rest1: 5, work2: 26, rest2: 5, work3: 26 },
    ] as WorkRestType[],
    isRunning: false,
    currentStage: 0,
    remainingTime: 0,
    timerInterval: undefined as NodeJS.Timeout | undefined,
    goals: [
      { label: '30 min', time: 30 },
      { label: '1 h', time: 60 },
      { label: '1 h 30', time: 90 },
      { label: '2 h', time: 120 },
      { label: '2 h 30', time: 180 },
      { label: '3 h', time: 240 },
    ] as GoalType[],
    countGoal: 0,
    goalProgress: {} as GoalProgressType,
    goalChoice: 0,
    timePast: 0,
    notification: new Audio('../assets/sound/notification.mp3'),
    countClick: 0,
    isStarting: false,
    totalClicksPerSeconds: 0,

    // Les éléments du DOM
    DOM: {
      timer: {
        buttonsTimer: document.querySelectorAll<HTMLButtonElement>(
          '.timer-choice button[data-action]'
        ),
        choiceTimer:
          document.querySelector<HTMLParagraphElement>('.timer-choice p'),
        restNumberTimer: document.querySelector<HTMLParagraphElement>(
          '.timer-rest__number'
        ),
        buttonStartTimer:
          document.querySelector<HTMLButtonElement>('.timer-button'),
        sessionNumberTimer: document.querySelector<HTMLParagraphElement>(
          '.session-timer__number'
        ),
        messageNextStage: document.querySelector<HTMLSpanElement>(
          '.session-timer__next-step span'
        ),
        sessionError:
          document.querySelector<HTMLParagraphElement>('.session-error'),
        sessionWrapper:
          document.querySelector<HTMLDivElement>('.session-timer'),
        buttonNextStage: document.querySelector<HTMLButtonElement>(
          '.control-next-stage'
        ),
        buttonResumeStage: document.querySelector<HTMLButtonElement>(
          '.control-resume-stage'
        ),
        buttonStopStage: document.querySelector<HTMLButtonElement>(
          '.control-stop-stage'
        ),
      },
      goal: {
        buttonsGoal: document.querySelectorAll<HTMLButtonElement>(
          '.goal-choice button[data-action]'
        ),
        buttonSaveGoal:
          document.querySelector<HTMLButtonElement>('.goal-button'),
        goalChoice:
          document.querySelector<HTMLParagraphElement>('.goal-choice p'),
        goalAchievedNumber: document.querySelector<HTMLSpanElement>(
          '.goal-achieved__number'
        ),
        goalProgressBar: document.querySelector<HTMLSpanElement>(
          '.goal-achieved__progress-bar span'
        ),
      },
      theme: {
        switch: document.querySelector<HTMLDivElement>('.header-theme'),
      },
      topbar: {
        minimize: document.querySelector<HTMLButtonElement>('#minimize'),
        maximize: document.querySelector<HTMLButtonElement>('#maximize'),
        close: document.querySelector<HTMLButtonElement>('#close'),
      },
      clicker: {
        button: document.querySelector<HTMLButtonElement>('.clicker-button'),
        timer: document.querySelector<HTMLSpanElement>('.clicker-button span'),
        numberClicks: document.querySelector<HTMLParagraphElement>(
          '.clicker-number-clicks'
        ),
        reward: document.querySelector<HTMLDivElement>('.clicker-rewards'),
      },
    },

    /**
     * Initialisation de l'application.
     */
    init: (): void => {
      App.setupHandlers();
      App.initTheme();
    },

    /**
     * Mise en place des gestionnaires d'évènements.
     */
    setupHandlers: (): void => {
      // Pomodoro
      App.renderSessionInfo();
      App.computeButtonClass(
        '.timer-choice',
        App.countTimer,
        App.sessions.length
      );

      App.DOM.timer.buttonsTimer.forEach((button) => {
        button.addEventListener('click', () => {
          const action = button.dataset.action as 'increment' | 'decrement';
          App.updateChoice(action, 'timer');
        });
      });

      App.DOM.timer.buttonStartTimer?.addEventListener(
        'click',
        App.managePomodoroSession
      );

      App.DOM.timer.buttonNextStage?.addEventListener('click', App.nextStage);
      App.DOM.timer.buttonStopStage?.addEventListener('click', App.stopTimer);
      App.DOM.timer.buttonResumeStage?.addEventListener(
        'click',
        App.resumeTimer
      );

      // Goal
      App.loadGoalChoice();
      App.loadGoalProgress();
      App.renderGoalInfo();
      App.computeButtonClass('.goal-choice', App.countGoal, App.goals.length);

      App.DOM.goal.buttonsGoal.forEach((button) => {
        button.addEventListener('click', () => {
          const action = button.dataset.action as 'increment' | 'decrement';
          App.updateChoice(action, 'goal');
        });
      });

      App.DOM.goal.buttonSaveGoal?.addEventListener(
        'click',
        App.manageGoalToday
      );

      // Light/dark theme
      App.DOM.theme.switch?.addEventListener('click', App.handleClickSwitch);
      App.DOM.theme.switch?.addEventListener(
        'keydown',
        App.handleKeydownSwitch
      );

      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', (event) => {
          const newTheme = event.matches ? 'dark' : 'light';
          App.setTheme(newTheme);
        });

      App.setupRowLettersTable();

      // TopBar
      App.DOM.topbar.close?.addEventListener('click', () => {
        window.electron.ipcRenderer.send('window-close');
      });

      App.DOM.topbar.minimize?.addEventListener('click', () => {
        window.electron.ipcRenderer.send('window-minimize');
      });

      App.DOM.topbar.maximize?.addEventListener('click', () => {
        window.electron.ipcRenderer.send('window-maximize');
      });

      // Clicker

      App.DOM.clicker.button?.addEventListener('click', App.startGame);
    },

    /**
     * Exemple de fonction.
     */
    renderSessionInfo: (): void => {
      const { choiceTimer, restNumberTimer, sessionWrapper } = App.DOM.timer;

      if (!choiceTimer || !restNumberTimer || !sessionWrapper) return;

      choiceTimer.innerText = App.timer[App.countTimer].time;
      restNumberTimer.innerText = App.timer[App.countTimer].rest.toString();
      sessionWrapper.classList.add('hidden');
    },

    updateChoice: (
      action: 'increment' | 'decrement',
      type: 'timer' | 'goal'
    ): void => {
      const isIncrement = action === 'increment';
      const isTimer = type === 'timer';

      if (isTimer) {
        App.countTimer = Math.max(
          0,
          Math.min(
            App.countTimer + (isIncrement ? 1 : -1),
            App.sessions.length - 1
          )
        );
        App.renderSessionInfo();
        App.computeButtonClass(
          '.timer-choice',
          App.countTimer,
          App.sessions.length
        );
      } else {
        App.countGoal = Math.max(
          0,
          Math.min(App.countGoal + (isIncrement ? 1 : -1), App.goals.length - 1)
        );
        App.computeButtonClass('.goal-choice', App.countGoal, App.goals.length);
        App.renderGoalInfo();
      }
    },

    computeButtonClass: (
      selector: string,
      count: number,
      max: number
    ): void => {
      const decrementButton = document.querySelector<HTMLButtonElement>(
        `${selector} button:first-child`
      );
      const incrementButton = document.querySelector<HTMLButtonElement>(
        `${selector} button:last-child`
      );

      if (!decrementButton || !incrementButton) return;

      decrementButton.disabled = count === 0;
      incrementButton.disabled = count === max - 1;
    },

    managePomodoroSession: (): void => {
      const session = App.sessions[App.countTimer];

      if (App.isRunning) return;

      App.startTimer(session.work1, session);
    },

    startTimer: (duration: number, session: WorkRestType): void => {
      const stages = Object.keys(session) as (keyof WorkRestType)[];
      const currentStageName = stages[App.currentStage];
      const nextStageName = stages[App.currentStage + 1];
      let timeLeft = duration * 60;
      let minutes: number | string, seconds: number | string;

      App.isRunning = true;

      const {
        buttonStartTimer,
        sessionWrapper,
        sessionError,
        sessionNumberTimer,
        buttonsTimer,
        messageNextStage,
      } = App.DOM.timer;

      console.log(`Début du timer : ${currentStageName}`);

      if (
        !buttonStartTimer ||
        !sessionWrapper ||
        !sessionError ||
        !sessionNumberTimer ||
        !buttonsTimer ||
        !messageNextStage
      )
        return;

      buttonStartTimer.disabled = true;
      buttonsTimer.forEach((button) => {
        button.disabled = true;
      });
      sessionWrapper.classList.remove('hidden');
      sessionError.classList.add('hidden');

      if (!nextStageName) messageNextStage.innerHTML = 'Fin de session';
      else if (nextStageName.match(/rest/i))
        messageNextStage.innerHTML = 'Pause';
      else if (nextStageName.match(/work/i))
        messageNextStage.innerHTML = 'Concentration';

      sessionNumberTimer.innerText = `${Math.floor(duration)} min`;

      App.timerInterval = setInterval(() => {
        timeLeft--;

        App.remainingTime = timeLeft;

        App.timePast = duration - App.remainingTime / 60;

        minutes = Math.floor(timeLeft / 60);
        seconds = timeLeft % 60;

        minutes = minutes < 1 ? '≃1' : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        sessionNumberTimer.innerText = `${minutes as string} min`;
        console.log(`${minutes as string} min ${seconds}`);

        if (timeLeft === 0) {
          clearInterval(App.timerInterval);
          App.currentStage++;

          App.goalProgress.date = new Date().toLocaleDateString();
          App.goalProgress.progress += App.timePast;

          localStorage.setItem(
            'goalProgress',
            JSON.stringify(App.goalProgress)
          );

          App.renderGoalInfo();

          if (App.currentStage < stages.length) {
            const notificationTitle = "C'est terminé !";
            const notificationIcon = '../assets/img/logo.svg';
            const notificationBody = 'Prêt pour continuer ?';

            App.sendNotification({
              title: notificationTitle,
              icon: notificationIcon,
              body: notificationBody,
              soundPlayed: true,
            });

            const nextStageName = stages[App.currentStage];
            const nextDuration = session[nextStageName] as number;

            App.isRunning = false;

            App.startTimer(nextDuration, session);
          } else {
            const notificationTitle = 'Session Pomodoro terminée !';
            const notificationIcon = '../assets/img/logo.svg';
            const notificationBody = 'Prêt pour une nouvelle session ?';

            App.sendNotification({
              title: notificationTitle,
              icon: notificationIcon,
              body: notificationBody,
              soundPlayed: true,
            });

            App.isRunning = false;
            buttonStartTimer.disabled = false;
            buttonsTimer.forEach((button) => {
              button.disabled = false;
            });
            App.currentStage = 0;
            sessionWrapper.classList.add('hidden');
            sessionError.classList.remove('hidden');
            App.resetTimer();
            App.computeButtonClass(
              '.timer-choice',
              App.countTimer,
              App.sessions.length
            );
            console.log('Session Pomodoro terminée!');
          }
        }
      }, 1000);
    },

    resetTimer: (): void => {
      if (App.timerInterval) {
        clearInterval(App.timerInterval);
      }

      App.isRunning = false;
      App.currentStage = 0;

      const { buttonStartTimer, sessionWrapper, buttonsTimer } = App.DOM.timer;
      if (buttonStartTimer && sessionWrapper && buttonsTimer) {
        buttonStartTimer.disabled = false;
        buttonsTimer.forEach((button) => {
          button.disabled = false;
        });
        sessionWrapper.classList.add('hidden');
      }

      App.renderSessionInfo();
    },

    nextStage: (): void => {
      if (App.timerInterval) {
        clearInterval(App.timerInterval);
      }

      const session = App.sessions[App.countTimer];
      const stages = Object.keys(session) as (keyof WorkRestType)[];

      App.currentStage++;

      if (App.currentStage < stages.length) {
        const nextStageName = stages[App.currentStage];
        const nextDuration = session[nextStageName] as number;

        App.goalProgress.date = new Date().toLocaleDateString();
        App.goalProgress.progress += App.timePast;

        localStorage.setItem('goalProgress', JSON.stringify(App.goalProgress));

        console.log(`Passage manuel à l'étape: ${nextStageName}`);

        App.isRunning = false;
        App.startTimer(nextDuration, session);
        App.renderGoalInfo();
      } else {
        App.isRunning = false;
        App.currentStage = 0;

        App.goalProgress.date = new Date().toLocaleDateString();
        App.goalProgress.progress += App.timePast;

        localStorage.setItem('goalProgress', JSON.stringify(App.goalProgress));

        const { buttonStartTimer, sessionWrapper, sessionError, buttonsTimer } =
          App.DOM.timer;

        if (buttonStartTimer && sessionWrapper && sessionError) {
          buttonStartTimer.disabled = false;
          buttonsTimer.forEach((button) => {
            button.disabled = false;
          });
          sessionWrapper.classList.add('hidden');
          sessionError.classList.remove('hidden');
        }
        App.resetTimer();
        App.computeButtonClass(
          '.timer-choice',
          App.countTimer,
          App.sessions.length
        );
        console.log('Session terminée');
        App.renderGoalInfo();
      }
    },

    stopTimer: (): void => {
      if (App.timerInterval) {
        clearInterval(App.timerInterval);
      }

      App.isRunning = false;

      const { buttonResumeStage, buttonStopStage } = App.DOM.timer;
      buttonResumeStage?.classList.remove('hidden');
      buttonStopStage?.classList.add('hidden');
    },

    resumeTimer: (): void => {
      const session = App.sessions[App.countTimer];

      const remainingMinutes = App.remainingTime / 60;

      App.startTimer(remainingMinutes, session);

      const { buttonResumeStage, buttonStopStage } = App.DOM.timer;
      buttonResumeStage?.classList.add('hidden');
      buttonStopStage?.classList.remove('hidden');
    },

    manageGoalToday: (): void => {
      App.goalChoice = App.goals[App.countGoal].time;
      localStorage.setItem('goalChoice', App.goalChoice.toString());

      App.renderGoalInfo();
    },

    renderGoalInfo: (): void => {
      const { goalChoice, goalAchievedNumber, goalProgressBar } = App.DOM.goal;

      if (!goalChoice || !goalAchievedNumber || !goalProgressBar) return;

      goalAchievedNumber.innerText = `${String(
        Math.round((100 * App.goalProgress.progress) / App.goalChoice)
      )}%`;

      const goalToDisplay = App.goals[App.countGoal];

      goalChoice.innerText = goalToDisplay.label;

      goalProgressBar.style.width = `${String(
        Math.round((100 * App.goalProgress.progress) / App.goalChoice)
      )}%`;
    },

    loadGoalProgress: (): void => {
      const savedProgress: GoalProgressType = JSON.parse(
        localStorage.getItem('goalProgress') as string
      );

      App.goalProgress = savedProgress
        ? savedProgress
        : {
            date: new Date().toLocaleDateString(),
            progress: 0,
          };

      App.goalProgress =
        App.goalProgress.date !== new Date().toLocaleDateString()
          ? {
              date: new Date().toLocaleDateString(),
              progress: 0,
            }
          : App.goalProgress;

      App.renderGoalInfo();
    },

    loadGoalChoice: (): void => {
      const savedChoice = localStorage.getItem('goalChoice');

      App.goalChoice = savedChoice ? Number(savedChoice) : App.goals[0].time;

      const currentGoalIndex = App.goals.findIndex(
        (goal) => goal.time === App.goalChoice
      );
      App.countGoal = currentGoalIndex;

      App.renderGoalInfo();
    },

    toggleAriaChecked: (target: EventTarget | null): string | void => {
      if (!(target instanceof HTMLElement)) return;

      const currentState = target.getAttribute('aria-checked') === 'true';
      const newState = String(!currentState);
      target.setAttribute('aria-checked', newState);
      return newState;
    },

    toggleTheme: (target: EventTarget | null): void => {
      const newState = App.toggleAriaChecked(target);
      const theme = newState === 'true' ? 'dark' : 'light';
      App.setTheme(theme);
    },

    handleClickSwitch: (e: MouseEvent): void => {
      e.preventDefault();
      App.toggleTheme(e.currentTarget);
    },

    handleKeydownSwitch: (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        App.toggleTheme(e.currentTarget);
      }
    },

    getPreferredTheme: (): string => {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme) {
        return storedTheme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    },

    setTheme: (theme: string): void => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        App.DOM.theme.switch?.setAttribute('aria-checked', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        App.DOM.theme.switch?.setAttribute('aria-checked', 'false');
      }
      localStorage.setItem('theme', theme);
    },

    initTheme: (): void => {
      const theme = App.getPreferredTheme();
      App.setTheme(theme);
    },

    sendNotification: ({
      title,
      icon,
      body,
      soundPlayed,
    }: NotificationType): void => {
      new window.Notification(title, {
        icon: icon,
        body: body,
      });
      if (soundPlayed) {
        App.notification.play();
      }
    },

    getLettersData: async (): Promise<LetterType[]> => {
      try {
        const data = await window.api.loadJson();
        return data;
      } catch (error) {
        console.error('Erreur lors du chargement du JSON :', error);
        return [];
      }
    },

    setupRowLettersTable: async (): Promise<void> => {
      const letters = await App.getLettersData();
      const tableBody = document.querySelector('.letters-table tbody');

      if (!tableBody) return;

      if (letters.length > 0) {
        letters.forEach((item) => {
          tableBody.innerHTML += `
              <tr>
                <td scope="row">${item.name}</td>
                <td><span>${item.letter}</span></td>
                <td>
                  <div class="letters-table__copy">
                    <button type="button" data-letter="${item.letter}">Copier</button>
                  </div>
                </td>
              </tr>`;
        });
      }

      tableBody
        .querySelectorAll<HTMLButtonElement>('button[data-letter]')
        .forEach((button) => {
          button.addEventListener('click', () => {
            const parent = button.parentElement as HTMLElement;
            const letter = button.dataset.letter as string;

            App.handleCopyLetter(letter, parent);
          });
        });
    },

    handleCopyLetter: (letter: string, parent: HTMLElement): void => {
      navigator.clipboard.writeText(letter).then(() => {
        const existingTooltip = parent.querySelector('.tooltip');
        if (existingTooltip) {
          existingTooltip.remove();
        }

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.innerHTML = `<span class="tooltip-content">Caractère copié</span>`;

        parent.appendChild(tooltip);

        setTimeout(() => {
          tooltip.remove();
        }, 1000);
      });
    },

    startGame: (): void => {
      const { timer, numberClicks, button, reward } = App.DOM.clicker;

      if (!timer || !numberClicks || !button || !reward) return;

      if (!App.isStarting) {
        let timeLeft = 10;
        App.countClick = 0;
        App.isStarting = true;

        numberClicks.innerText = `Votre nombre de cliques : 0 CPS`;
        timer.innerText = `Temps restant : ${timeLeft} s`;

        const timerGame = setInterval(() => {
          timeLeft--;
          timer.innerText = `Temps restant : ${timeLeft} s`;

          if (timeLeft === 0) {
            clearInterval(timerGame);
            App.isStarting = false;
            timer.innerText = `Temps écoulé !`;

            button.disabled = true;
            numberClicks.innerText = `Cliquez pour recommencer !`;

            if (App.totalClicksPerSeconds > 14) {
              reward.innerHTML += `<svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6.5 9H5C4.33696 9 3.70107 8.73661 3.23223 8.26777C2.76339 7.79893 2.5 7.16304 2.5 6.5C2.5 5.83696 2.76339 5.20107 3.23223 4.73223C3.70107 4.26339 4.33696 4 5 4H6.5" stroke="#6DC36D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M18.5 9H20C20.663 9 21.2989 8.73661 21.7678 8.26777C22.2366 7.79893 22.5 7.16304 22.5 6.5C22.5 5.83696 22.2366 5.20107 21.7678 4.73223C21.2989 4.26339 20.663 4 20 4H18.5" stroke="#6DC36D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M4.5 22H20.5" stroke="#6DC36D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M10.5 14.66V17C10.5 17.55 10.03 17.98 9.53 18.21C8.35 18.75 7.5 20.24 7.5 22" stroke="#6DC36D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M14.5 14.66V17C14.5 17.55 14.97 17.98 15.47 18.21C16.65 18.75 17.5 20.24 17.5 22" stroke="#6DC36D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M18.5 2H6.5V9C6.5 10.5913 7.13214 12.1174 8.25736 13.2426C9.38258 14.3679 10.9087 15 12.5 15C14.0913 15 15.6174 14.3679 16.7426 13.2426C17.8679 12.1174 18.5 10.5913 18.5 9V2Z" stroke="#6DC36D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                  </svg>`;
            } else if (App.totalClicksPerSeconds > 11) {
              reward.innerHTML += `<svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.71002 15L3.16002 7.14C2.96382 6.80087 2.87155 6.41159 2.89466 6.02048C2.91777 5.62937 3.05524 5.25366 3.29002 4.94L4.90002 2.8C5.08631 2.55161 5.32788 2.35 5.60559 2.21115C5.8833 2.07229 6.18953 2 6.50002 2H18.5C18.8105 2 19.1167 2.07229 19.3944 2.21115C19.6722 2.35 19.9137 2.55161 20.1 2.8L21.7 4.94C21.9363 5.25265 22.0756 5.62784 22.1005 6.01897C22.1254 6.4101 22.0348 6.79992 21.84 7.14L17.29 15" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M11.5 12L5.62 2.19995" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M13.5 12L19.38 2.19995" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M8.5 7H16.5" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12.5 22C15.2614 22 17.5 19.7614 17.5 17C17.5 14.2386 15.2614 12 12.5 12C9.73858 12 7.5 14.2386 7.5 17C7.5 19.7614 9.73858 22 12.5 22Z" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12.5 18V16H12" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                  </svg>`;
            } else if (App.totalClicksPerSeconds > 8) {
              reward.innerHTML += `<svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7.71002 15L3.16002 7.14C2.96382 6.80087 2.87155 6.41159 2.89466 6.02048C2.91777 5.62937 3.05524 5.25366 3.29002 4.94L4.90002 2.8C5.08631 2.55161 5.32788 2.35 5.60559 2.21115C5.8833 2.07229 6.18953 2 6.50002 2H18.5C18.8105 2 19.1167 2.07229 19.3944 2.21115C19.6722 2.35 19.9137 2.55161 20.1 2.8L21.7 4.94C21.9363 5.25265 22.0756 5.62784 22.1005 6.01897C22.1254 6.4101 22.0348 6.79992 21.84 7.14L17.29 15" stroke="#C0C0C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M11.5 12L5.62 2.19995" stroke="#C0C0C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M13.5 12L19.38 2.19995" stroke="#C0C0C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M8.5 7H16.5" stroke="#C0C0C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12.5 22C15.2614 22 17.5 19.7614 17.5 17C17.5 14.2386 15.2614 12 12.5 12C9.73858 12 7.5 14.2386 7.5 17C7.5 19.7614 9.73858 22 12.5 22Z" stroke="#C0C0C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12.5 18V16H12" stroke="#C0C0C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                  </svg>`;
            } else if (App.totalClicksPerSeconds > 5) {
              reward.innerHTML += `<svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M7.70996 15L3.15996 7.14C2.96376 6.80087 2.87149 6.41159 2.8946 6.02048C2.91771 5.62937 3.05518 5.25366 3.28996 4.94L4.89996 2.8C5.08625 2.55161 5.32782 2.35 5.60553 2.21115C5.88324 2.07229 6.18947 2 6.49996 2H18.5C18.8104 2 19.1167 2.07229 19.3944 2.21115C19.6721 2.35 19.9137 2.55161 20.1 2.8L21.7 4.94C21.9363 5.25265 22.0755 5.62784 22.1004 6.01897C22.1253 6.4101 22.0347 6.79992 21.84 7.14L17.29 15" stroke="#CD7F32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                      <path d="M11.5 12L5.62 2.19995" stroke="#CD7F32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                      <path d="M13.5 12L19.38 2.19995" stroke="#CD7F32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                      <path d="M8.5 7H16.5" stroke="#CD7F32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                      <path d="M12.5 22C15.2614 22 17.5 19.7614 17.5 17C17.5 14.2386 15.2614 12 12.5 12C9.73858 12 7.5 14.2386 7.5 17C7.5 19.7614 9.73858 22 12.5 22Z" stroke="#CD7F32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                      <path d="M12.5 18V16H12" stroke="#CD7F32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                  </svg>`;
            }

            setTimeout(() => {
              button.disabled = false;
            }, 5000);
          }
        }, 1000);
      } else {
        App.countClick++;
        const timePassed =
          10 -
          parseInt(
            timer.innerText.replace('Temps restant : ', '').replace(' s', '')
          );
        let clicksPerSecond = App.countClick / timePassed;

        if (clicksPerSecond === Infinity) {
          clicksPerSecond = 0;
        }
        numberClicks.innerText = `Votre nombre de cliques : ${clicksPerSecond.toFixed(2)} CPS`;

        App.totalClicksPerSeconds = clicksPerSecond;
      }
    },
  };

  App.init();
});
