window.__ModuleLoader__.load({
  id: 'dsh-earnings-clock',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useMemo, useState, useSyncExternalStore } = React;

    /** Locale namespace shared by the metadata files and the Client dictionaries. */
    const NS = 'earningsClock';
    /** Stable ids: dock entry, settings section and its nav icon all reuse it. */
    const SECTION_ID = 'earnings-clock';
    const STORAGE_KEY = 'dsh-earnings-clock:v1';

    const DEFAULTS = Object.freeze({
      start: '09:00',
      end: '18:00',
      wage: 0,
      currency: '¥',
      weekdaysOnly: true,
    });

    // ── dictionaries ────────────────────────────────────────────────────────
    const ZH = {
      'dock.aria': '今天赚了多少钱',
      'dock.tooltip': '{start} – {end}，日薪 {wage}',
      'dock.perDay': '日薪 {amount}',
      'dock.worked': '已工作 {time}',
      'dock.before': '距上班 {time}',
      'dock.remaining': '距下班 {time}',
      'dock.overtime': '已下班 · 加班 {time}',
      'dock.done': '今日已完成',
      'dock.notStarted': '还没开始',
      'dock.restTitle': '今天休息',
      'dock.restCaption': '周末不计入工资',
      'dock.unsetTitle': '设置上下班时间与日薪，开始计算今天赚了多少钱',
      'dock.openSettings': '去设置',
      'dock.openSettingsTitle': '打开插件设置',
      'settings.nav': '今天赚了多少钱',
      'settings.title': '今天赚了多少钱',
      'settings.intro': '在这里预设每天的上下班时间与工资。输入框上方会一直显示今天已经赚到的金额、当前进度和距离下班的时间，深浅色主题自动跟随。',
      'settings.start': '上班时间',
      'settings.end': '下班时间',
      'settings.wage': '每日工资',
      'settings.currency': '货币符号',
      'settings.timeHint': '24 小时制，例如 09:00',
      'settings.wageHint': '例如 800',
      'settings.currencyHint': '例如 ¥、$、€',
      'settings.weekdaysOnly': '只在工作日计算',
      'settings.weekdaysOnlyHint': '周六、周日显示为休息日，不计入工资。',
      'settings.preview': '今日预览',
      'settings.previewLine': '现在已赚 {percent}% 的日薪',
      'settings.previewRest': '今天是休息日，不计入工资。',
      'settings.previewUnset': '填写每日工资后开始计算。',
      'settings.invalidRange': '下班时间需要晚于上班时间。',
      'settings.invalidWage': '请输入大于 0 的数字。',
      'settings.autosave': '修改会自动保存',
      'settings.reset': '恢复默认',
      'settings.saved': '已保存',
    };

    const EN = {
      'dock.aria': 'Earnings today',
      'dock.tooltip': '{start} – {end}, daily wage {wage}',
      'dock.perDay': 'Daily {amount}',
      'dock.worked': 'Worked {time}',
      'dock.before': 'Starts in {time}',
      'dock.remaining': 'Leaves {time}',
      'dock.overtime': 'Off duty · overtime {time}',
      'dock.done': 'Done for today',
      'dock.notStarted': 'Not started',
      'dock.restTitle': 'Day off',
      'dock.restCaption': 'Weekends are not counted',
      'dock.unsetTitle': 'Set your work hours and daily wage to start counting today’s earnings',
      'dock.openSettings': 'Set up',
      'dock.openSettingsTitle': 'Open plugin settings',
      'settings.nav': 'Earnings Clock',
      'settings.title': 'Earnings Clock',
      'settings.intro': 'Preset your daily work hours and wage here. Above the composer the plugin keeps showing how much you have earned today, the current progress, and the time left until you clock off. Light and dark themes are followed automatically.',
      'settings.start': 'Start time',
      'settings.end': 'End time',
      'settings.wage': 'Daily wage',
      'settings.currency': 'Currency symbol',
      'settings.timeHint': '24-hour clock, e.g. 09:00',
      'settings.wageHint': 'e.g. 800',
      'settings.currencyHint': 'e.g. ¥, $, €',
      'settings.weekdaysOnly': 'Weekdays only',
      'settings.weekdaysOnlyHint': 'Saturdays and Sundays show as a day off and add nothing.',
      'settings.preview': 'Today at a glance',
      'settings.previewLine': '{percent}% of today’s wage earned',
      'settings.previewRest': 'Today is a day off, so nothing is counted.',
      'settings.previewUnset': 'Set a daily wage to start counting.',
      'settings.invalidRange': 'End time must be later than the start time.',
      'settings.invalidWage': 'Enter a number greater than 0.',
      'settings.autosave': 'Changes are saved automatically',
      'settings.reset': 'Reset to defaults',
      'settings.saved': 'Saved',
    };

    const TEXT = { zh: ZH, en: EN };

    function activeLang(ctx) {
      try {
        const snap = ctx && ctx.locale && typeof ctx.locale.getSnapshot === 'function'
          ? ctx.locale.getSnapshot()
          : null;
        const id = snap && typeof snap.active === 'string' ? snap.active.toLowerCase() : 'en';
        return id.indexOf('zh') === 0 ? 'zh' : 'en';
      } catch (error) {
        return 'en';
      }
    }

    /** Prefer the seat's own `t`; fall back to the local dictionary if absent. */
    function makeT(ctx, t) {
      if (typeof t === 'function') return t;
      const dict = TEXT[activeLang(ctx)] || EN;
      return function translate(key, params) {
        let out = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
        if (params) {
          out = out.replace(/\{(\w+)\}/g, function (match, name) {
            return params[name] === undefined || params[name] === null ? match : String(params[name]);
          });
        }
        return out;
      };
    }

    // ── settings store (client-local preference) ────────────────────────────
    /** Parse `HH:MM` into minutes after midnight; null when malformed. */
    function parseTime(text) {
      if (typeof text !== 'string') return null;
      const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
      if (!match) return null;
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      if (hours > 23 || minutes > 59) return null;
      return hours * 60 + minutes;
    }

    function asText(value, fallback) {
      return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback;
    }

    function normalize(raw) {
      const source = raw && typeof raw === 'object' ? raw : {};
      const wage = Number(source.wage);
      return {
        start: asText(source.start, DEFAULTS.start),
        end: asText(source.end, DEFAULTS.end),
        wage: Number.isFinite(wage) && wage > 0 ? wage : 0,
        currency: asText(source.currency, DEFAULTS.currency) || DEFAULTS.currency,
        weekdaysOnly: source.weekdaysOnly === undefined ? DEFAULTS.weekdaysOnly : !!source.weekdaysOnly,
      };
    }

    function readFromStorage() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return normalize(DEFAULTS);
        return normalize(JSON.parse(raw));
      } catch (error) {
        return normalize(DEFAULTS);
      }
    }

    let cache = readFromStorage();
    const listeners = new Set();

    function emit() {
      listeners.forEach(function (listener) {
        try {
          listener();
        } catch (error) {
          /* a broken subscriber must not stop the others */
        }
      });
    }

    function getSettings() {
      return cache;
    }

    function subscribeSettings(listener) {
      listeners.add(listener);
      return function unsubscribe() {
        listeners.delete(listener);
      };
    }

    function sameSettings(a, b) {
      return a.start === b.start
        && a.end === b.end
        && a.wage === b.wage
        && a.currency === b.currency
        && a.weekdaysOnly === b.weekdaysOnly;
    }

    function writeSettings(patch) {
      const next = normalize(Object.assign({}, cache, patch));
      if (sameSettings(cache, next)) return;
      cache = next;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
      } catch (error) {
        /* private mode / quota: keep the in-memory value so the UI still works */
      }
      emit();
    }

    function useSettings() {
      return useSyncExternalStore(subscribeSettings, getSettings, getSettings);
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', function (event) {
        if (event.key !== STORAGE_KEY) return;
        cache = readFromStorage();
        emit();
      });
    }

    // ── clock + money ───────────────────────────────────────────────────────
    function useNow(active) {
      const [now, setNow] = useState(function () {
        return Date.now();
      });
      useEffect(function () {
        if (!active) return undefined;
        const id = window.setInterval(function () {
          setNow(Date.now());
        }, 1000);
        return function () {
          window.clearInterval(id);
        };
      }, [active]);
      return now;
    }

    function pad2(value) {
      return value < 10 ? '0' + value : String(value);
    }

    /** `h:mm:ss` (hours omitted at zero) for countdowns. */
    function formatClock(ms) {
      const total = Math.max(0, Math.floor(ms / 1000));
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      return (hours > 0 ? hours + ':' : '') + pad2(minutes) + ':' + pad2(seconds);
    }

    function formatMoney(currency, amount) {
      const fixed = Math.max(0, Math.round(amount * 100) / 100).toFixed(2);
      const parts = fixed.split('.');
      const grouped = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return (currency || DEFAULTS.currency) + grouped + '.' + parts[1];
    }

    function isWeekend(now) {
      const day = new Date(now).getDay();
      return day === 0 || day === 6;
    }

    /**
     * Project one instant onto the configured workday.
     * Phases: unset → rest → before → working → after.
     */
    function computeView(settings, now) {
      const startMin = parseTime(settings.start);
      const endMin = parseTime(settings.end);
      const wage = Number(settings.wage);
      const validRange = startMin !== null && endMin !== null && endMin > startMin;
      const configured = validRange && Number.isFinite(wage) && wage > 0;
      const currency = settings.currency || DEFAULTS.currency;
      const view = {
        configured: configured,
        phase: 'unset',
        restDay: false,
        currency: currency,
        wage: configured ? wage : 0,
        progress: 0,
        earned: 0,
        workedMs: 0,
        totalMs: 0,
        msToStart: 0,
        msToEnd: 0,
        overtimeMs: 0,
        rangeInvalid: startMin !== null && endMin !== null && endMin <= startMin,
      };
      if (!configured) return view;

      const dayStart = new Date(now);
      dayStart.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const dayEnd = new Date(now);
      dayEnd.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
      const totalMs = dayEnd.getTime() - dayStart.getTime();
      view.totalMs = totalMs;

      if (settings.weekdaysOnly && isWeekend(now)) {
        view.phase = 'rest';
        view.restDay = true;
        return view;
      }
      if (now < dayStart.getTime()) {
        view.phase = 'before';
        view.msToStart = dayStart.getTime() - now;
        return view;
      }
      if (now >= dayEnd.getTime()) {
        view.phase = 'after';
        view.progress = 1;
        view.earned = wage;
        view.workedMs = totalMs;
        view.overtimeMs = now - dayEnd.getTime();
        return view;
      }
      view.phase = 'working';
      view.workedMs = now - dayStart.getTime();
      view.progress = view.workedMs / totalMs;
      view.earned = wage * view.progress;
      view.msToEnd = dayEnd.getTime() - now;
      return view;
    }

    // ── open the settings section from the dock ─────────────────────────────
    /**
     * The settings shell publishes its open-section action on the
     * `sidebar.settings` slot registration's store. Reaching it is optional:
     * when the shell is absent the dock simply shows no button.
     */
    function settingsActions(ctx) {
      try {
        const slots = ctx && ctx.slots;
        if (!slots || typeof slots.entries !== 'function') return undefined;
        const entries = slots.entries('sidebar.settings') || [];
        for (let index = 0; index < entries.length; index += 1) {
          const entry = entries[index];
          const handle = entry && (entry.store || (entry.options && entry.options.store));
          if (!handle || typeof handle.create !== 'function') continue;
          const shell = handle.create();
          if (shell && shell.actions && typeof shell.actions.openSection === 'function') return shell.actions;
        }
      } catch (error) {
        /* no settings shell in this composition */
      }
      return undefined;
    }

    // ── shared visual pieces ────────────────────────────────────────────────
    const labelPrimary = 'var(--dsw-alias-label-primary)';
    const labelSecondary = 'var(--dsw-alias-label-secondary)';
    const labelTertiary = 'var(--dsw-alias-label-tertiary)';

    function GearIcon() {
      return h(
        'svg',
        {
          width: 15,
          height: 15,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('path', {
          d: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
          stroke: 'currentColor',
          strokeWidth: 1.7,
        }),
        h('path', {
          d: 'M19.4 13.5a7.6 7.6 0 0 0 0-3l1.7-1.3-1.8-3.1-2 .8a7.6 7.6 0 0 0-2.6-1.5L14.4 3h-3.6l-.3 2.4a7.6 7.6 0 0 0-2.6 1.5l-2-.8L4.1 9.2l1.7 1.3a7.6 7.6 0 0 0 0 3l-1.7 1.3 1.8 3.1 2-.8a7.6 7.6 0 0 0 2.6 1.5l.3 2.4h3.6l.3-2.4a7.6 7.6 0 0 0 2.6-1.5l2 .8 1.8-3.1-1.7-1.3Z',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinejoin: 'round',
        }),
      );
    }

    function CurrencyBadge(props) {
      return h(
        'span',
        {
          'aria-hidden': true,
          style: {
            display: 'grid',
            placeItems: 'center',
            flex: 'none',
            width: 22,
            height: 22,
            borderRadius: 999,
            background: 'var(--dsw-alias-brand-primary-soft)',
            color: 'var(--dsw-alias-brand-primary)',
            fontSize: 11,
            fontWeight: 650,
            lineHeight: 1,
          },
        },
        props.text,
      );
    }

    // ── the dock above the composer ─────────────────────────────────────────
    function EarningsDock(props) {
      const t = makeT(props.ctx, props.t);
      const settings = useSettings();
      const now = useNow(true);
      const view = computeView(settings, now);
      const actions = useMemo(function () {
        return settingsActions(props.ctx);
      }, [props.ctx]);

      const openSettings = actions
        ? function () {
          try {
            actions.openSection(SECTION_ID);
          } catch (error) {
            /* the shell no longer accepts the action */
          }
        }
        : null;

      const settingsButton = openSettings
        ? h(
          'button',
          {
            type: 'button',
            className: 'ec-icon-button',
            title: t('dock.openSettingsTitle'),
            'aria-label': t('dock.openSettingsTitle'),
            onClick: openSettings,
          },
          h(GearIcon, null),
        )
        : null;

      const perDay = formatMoney(view.currency, view.wage);

      if (!view.configured) {
        return h(
          'section',
          {
            className: 'ec-dock',
            'aria-label': t('dock.aria'),
            style: { justifyContent: 'space-between' },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 auto' } },
            h(CurrencyBadge, { text: settings.currency || DEFAULTS.currency }),
            h(
              'span',
              {
                style: {
                  fontSize: 13,
                  lineHeight: '18px',
                  color: labelSecondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              },
              t('dock.unsetTitle'),
            ),
          ),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 6, flex: 'none' } },
            openSettings
              ? h(
                'button',
                { type: 'button', className: 'ec-button', onClick: openSettings },
                t('dock.openSettings'),
              )
              : null,
            settingsButton,
          ),
        );
      }

      if (view.phase === 'rest') {
        return h(
          'section',
          {
            className: 'ec-dock',
            'aria-label': t('dock.aria'),
            style: { justifyContent: 'space-between' },
          },
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 auto' } },
            h(CurrencyBadge, { text: view.currency }),
            h('span', { style: { fontSize: 13, fontWeight: 550, color: labelPrimary } }, t('dock.restTitle')),
            h(
              'span',
              {
                style: {
                  fontSize: 12,
                  color: labelTertiary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              },
              t('dock.restCaption'),
            ),
          ),
          settingsButton,
        );
      }

      const percent = Math.round(view.progress * 100);
      let statusText = t('dock.done');
      let statusColor = 'var(--dsw-alias-state-success-primary)';
      let sideCaption = t('dock.worked', { time: formatClock(view.workedMs) });
      if (view.phase === 'before') {
        statusText = t('dock.notStarted');
        statusColor = labelTertiary;
        sideCaption = t('dock.before', { time: formatClock(view.msToStart) });
      } else if (view.phase === 'working') {
        statusText = t('dock.remaining', { time: formatClock(view.msToEnd) });
        statusColor = labelSecondary;
      } else if (view.overtimeMs >= 60000) {
        statusText = t('dock.overtime', { time: formatClock(view.overtimeMs) });
        statusColor = 'var(--dsw-alias-state-warn-primary)';
      }

      return h(
        'section',
        {
          className: 'ec-dock',
          'aria-label': t('dock.aria'),
          title: t('dock.tooltip', { start: settings.start, end: settings.end, wage: perDay }),
        },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'baseline', gap: 8, flex: 'none' } },
          h(
            'span',
            {
              style: {
                fontSize: 17,
                fontWeight: 650,
                lineHeight: '22px',
                letterSpacing: '0.01em',
                color: labelPrimary,
                fontVariantNumeric: 'tabular-nums',
              },
            },
            formatMoney(view.currency, view.earned),
          ),
          h(
            'span',
            { style: { fontSize: 11, color: labelTertiary, whiteSpace: 'nowrap' } },
            t('dock.perDay', { amount: perDay }),
          ),
        ),
        h(
          'div',
          {
            style: {
              flex: '1 1 150px',
              minWidth: 110,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            },
          },
          h(
            'div',
            {
              style: {
                position: 'relative',
                height: 5,
                borderRadius: 999,
                background: 'var(--dsw-alias-bg-layer-3)',
                overflow: 'hidden',
              },
            },
            h('div', {
              className: 'ec-fill',
              style: {
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: percent + '%',
                borderRadius: 999,
                background: 'var(--dsw-alias-brand-primary)',
              },
            }),
          ),
          h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                fontSize: 11,
                lineHeight: '14px',
                color: labelTertiary,
                fontVariantNumeric: 'tabular-nums',
              },
            },
            h('span', { style: { whiteSpace: 'nowrap' } }, sideCaption),
            h('span', { style: { whiteSpace: 'nowrap' } }, percent + '%'),
          ),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flex: 'none' } },
          h(
            'span',
            {
              style: {
                fontSize: 12,
                lineHeight: '18px',
                color: statusColor,
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              },
            },
            statusText,
          ),
          settingsButton,
        ),
      );
    }

    // ── settings section ────────────────────────────────────────────────────
    const inputClassName = 'ec-input';

    function Field(props) {
      return h(
        'label',
        { style: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 } },
        h('span', { style: { fontSize: 12, lineHeight: '16px', color: labelSecondary } }, props.label),
        props.children,
        props.hint ? h('span', { style: { fontSize: 11, lineHeight: '15px', color: labelTertiary } }, props.hint) : null,
        props.error ? h('span', { style: { fontSize: 11, lineHeight: '15px', color: 'var(--dsw-alias-state-error-primary)' } }, props.error) : null,
      );
    }

    function EarningsSettings(props) {
      const t = makeT(props.ctx, props.t);
      const settings = useSettings();
      const now = useNow(true);
      const view = computeView(settings, now);

      const [draft, setDraft] = useState(function () {
        return {
          start: settings.start,
          end: settings.end,
          wage: settings.wage > 0 ? String(settings.wage) : '',
          currency: settings.currency,
        };
      });

      function updateDraft(patch) {
        setDraft(function (previous) {
          return Object.assign({}, previous, patch);
        });
      }

      function onTimeChange(key) {
        return function (event) {
          const value = event.target.value;
          updateDraft({ [key]: value });
          if (parseTime(value) !== null) writeSettings({ [key]: value });
        };
      }

      function onTimeBlur(key) {
        return function () {
          if (parseTime(draft[key]) !== null) return;
          const fallback = key === 'start' ? DEFAULTS.start : DEFAULTS.end;
          updateDraft({ [key]: fallback });
          writeSettings({ [key]: fallback });
        };
      }

      function onWageBlur() {
        const raw = draft.wage.replace(/[,\s]/g, '');
        if (raw === '') {
          writeSettings({ wage: 0 });
          return;
        }
        const value = Number(raw);
        if (Number.isFinite(value) && value >= 0) {
          writeSettings({ wage: value });
          updateDraft({ wage: String(value) });
        }
      }

      function onCurrencyBlur() {
        const value = draft.currency.trim() || DEFAULTS.currency;
        updateDraft({ currency: value });
        writeSettings({ currency: value });
      }

      function reset() {
        setDraft({
          start: DEFAULTS.start,
          end: DEFAULTS.end,
          wage: '',
          currency: DEFAULTS.currency,
        });
        writeSettings({
          start: DEFAULTS.start,
          end: DEFAULTS.end,
          wage: 0,
          currency: DEFAULTS.currency,
          weekdaysOnly: true,
        });
      }

      const startMin = parseTime(draft.start);
      const endMin = parseTime(draft.end);
      const rangeError = startMin === null || endMin === null || endMin <= startMin
        ? t('settings.invalidRange')
        : '';

      const rawWage = draft.wage.replace(/[,\s]/g, '');
      const wageNumber = Number(rawWage);
      const wageError = rawWage !== '' && (!Number.isFinite(wageNumber) || wageNumber <= 0)
        ? t('settings.invalidWage')
        : '';

      const perDay = formatMoney(view.currency, view.wage);
      let previewText = t('settings.previewUnset');
      if (view.configured) {
        if (view.phase === 'rest') previewText = t('settings.previewRest');
        else if (view.phase === 'before') previewText = t('dock.before', { time: formatClock(view.msToStart) });
        else if (view.phase === 'working') previewText = t('settings.previewLine', { percent: Math.round(view.progress * 100) });
        else previewText = t('dock.done');
      }

      return h(
        'div',
        {
          style: {
            maxWidth: 760,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            color: labelPrimary,
          },
        },
        h('h2', { style: { margin: 0, fontSize: 18, lineHeight: '26px', fontWeight: 600 } }, t('settings.title')),
        h('p', { style: { margin: 0, fontSize: 13, lineHeight: '20px', color: labelTertiary } }, t('settings.intro')),
        h(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              padding: 16,
              borderRadius: 12,
              border: '1px solid var(--dsw-alias-border-l1)',
              background: 'var(--dsw-alias-bg-layer-1)',
            },
          },
          h(
            'div',
            { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 } },
            h(
              Field,
              { label: t('settings.start'), hint: t('settings.timeHint') },
              h('input', {
                className: inputClassName,
                type: 'text',
                inputMode: 'numeric',
                autoComplete: 'off',
                spellCheck: false,
                maxLength: 5,
                placeholder: '09:00',
                value: draft.start,
                onChange: onTimeChange('start'),
                onBlur: onTimeBlur('start'),
              }),
            ),
            h(
              Field,
              { label: t('settings.end'), hint: t('settings.timeHint') },
              h('input', {
                className: inputClassName,
                type: 'text',
                inputMode: 'numeric',
                autoComplete: 'off',
                spellCheck: false,
                maxLength: 5,
                placeholder: '18:00',
                value: draft.end,
                onChange: onTimeChange('end'),
                onBlur: onTimeBlur('end'),
              }),
            ),
            h(
              Field,
              { label: t('settings.wage'), hint: t('settings.wageHint'), error: wageError },
              h('input', {
                className: inputClassName,
                type: 'text',
                inputMode: 'decimal',
                autoComplete: 'off',
                spellCheck: false,
                maxLength: 14,
                placeholder: '800',
                value: draft.wage,
                onChange: function (event) {
                  updateDraft({ wage: event.target.value });
                },
                onBlur: onWageBlur,
              }),
            ),
            h(
              Field,
              { label: t('settings.currency'), hint: t('settings.currencyHint') },
              h('input', {
                className: inputClassName,
                type: 'text',
                autoComplete: 'off',
                spellCheck: false,
                maxLength: 4,
                placeholder: '¥',
                value: draft.currency,
                onChange: function (event) {
                  updateDraft({ currency: event.target.value });
                },
                onBlur: onCurrencyBlur,
              }),
            ),
          ),
          rangeError
            ? h('span', { style: { fontSize: 12, lineHeight: '16px', color: 'var(--dsw-alias-state-error-primary)' } }, rangeError)
            : null,
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 auto' } },
              h('span', { style: { fontSize: 13, lineHeight: '18px', color: labelPrimary } }, t('settings.weekdaysOnly')),
              h('span', { style: { fontSize: 11, lineHeight: '15px', color: labelTertiary } }, t('settings.weekdaysOnlyHint')),
            ),
            h(
              'button',
              {
                type: 'button',
                role: 'switch',
                className: 'ec-switch',
                'aria-checked': settings.weekdaysOnly ? 'true' : 'false',
                'aria-label': t('settings.weekdaysOnly'),
                'data-on': settings.weekdaysOnly ? 'true' : 'false',
                onClick: function () {
                  writeSettings({ weekdaysOnly: !settings.weekdaysOnly });
                },
              },
              h('span', { className: 'ec-switch-knob' }),
            ),
          ),
        ),
        h(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid var(--dsw-alias-border-l1)',
              background: 'var(--dsw-alias-bg-layer-2)',
            },
          },
          h('span', { style: { fontSize: 11, lineHeight: '15px', color: labelTertiary } }, t('settings.preview')),
          h(
            'div',
            { style: { display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' } },
            h(
              'span',
              {
                style: {
                  fontSize: 22,
                  lineHeight: '28px',
                  fontWeight: 650,
                  fontVariantNumeric: 'tabular-nums',
                },
              },
              view.configured ? formatMoney(view.currency, view.earned) : '—',
            ),
            view.configured
              ? h('span', { style: { fontSize: 12, color: labelTertiary } }, t('dock.perDay', { amount: perDay }))
              : null,
          ),
          h('span', { style: { fontSize: 12, lineHeight: '16px', color: labelSecondary } }, previewText),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' } },
          h(
            'button',
            { type: 'button', className: 'ec-ghost-button', onClick: reset },
            t('settings.reset'),
          ),
          h('span', { style: { fontSize: 11, color: labelTertiary } }, t('settings.autosave')),
        ),
      );
    }

    // ── nav icon ────────────────────────────────────────────────────────────
    function NavIcon(props) {
      const size = props && typeof props.size === 'number' ? props.size : 16;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('circle', { cx: 12, cy: 12, r: 8.6, stroke: 'currentColor', strokeWidth: 1.8 }),
        h('path', {
          d: 'M12 7.4V12l3.1 1.9',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M16.6 4.5a8.6 8.6 0 0 1 2.9 3.1',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
        }),
      );
    }

    // ── stylesheet (focus + hover + reduced motion; colors stay on tokens) ──
    const CSS = [
      '.ec-dock{box-sizing:border-box;flex:none;margin:0 auto;',
      'width:calc(100% - var(--dsh-composer-side-clearance,0px) - var(--dsh-composer-side-clearance,0px)',
      ' - var(--dsh-composer-dock-inset,0px) - var(--dsh-composer-dock-inset,0px)',
      ' - var(--dsh-composer-dock-inset,0px) - var(--dsh-composer-dock-inset,0px));',
      'max-width:calc(var(--dsh-composer-card-max-width,1000px)',
      ' - var(--dsh-composer-dock-inset,0px) - var(--dsh-composer-dock-inset,0px)',
      ' - var(--dsh-composer-dock-inset,0px) - var(--dsh-composer-dock-inset,0px));',
      'display:flex;align-items:center;gap:12px;flex-wrap:wrap;',
      'padding:8px 12px;border-radius:var(--dsw-radius-lg);',
      'background:var(--dsw-specific-menu);',
      'backdrop-filter:var(--dsw-menu-backdrop-filter);',
      'box-shadow:var(--dsw-elevation-panel);',
      'color:var(--dsw-alias-label-primary)}',
      '.ec-fill{transition:width 1s linear}',
      '.ec-input{box-sizing:border-box;width:100%;height:36px;padding:0 10px;',
      'border-radius:8px;border:1px solid var(--dsw-alias-border-l2);',
      'background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);',
      'font:inherit;font-size:13px;font-variant-numeric:tabular-nums;outline:none;',
      'transition:border-color .15s ease,box-shadow .15s ease}',
      '.ec-input::placeholder{color:var(--dsw-alias-label-tertiary)}',
      '.ec-input:hover{border-color:var(--dsw-alias-border-l3)}',
      '.ec-input:focus{border-color:var(--dsw-alias-brand-primary);',
      'box-shadow:0 0 0 3px var(--dsw-alias-brand-primary-soft)}',
      '.ec-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;',
      'height:26px;padding:0 10px;border-radius:8px;cursor:pointer;white-space:nowrap;',
      'border:1px solid var(--dsw-alias-border-l2);',
      'background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);',
      'font:inherit;font-size:12px;line-height:1;transition:background .15s ease}',
      '.ec-button:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.ec-icon-button{display:inline-grid;place-items:center;width:24px;height:24px;padding:0;',
      'border:none;border-radius:6px;cursor:pointer;background:transparent;',
      'color:var(--dsw-alias-label-tertiary);transition:background .15s ease,color .15s ease}',
      '.ec-icon-button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.ec-ghost-button{height:26px;padding:0 8px;border:none;border-radius:8px;cursor:pointer;',
      'background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;',
      'transition:background .15s ease,color .15s ease}',
      '.ec-ghost-button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.ec-switch{position:relative;flex:none;width:36px;height:20px;padding:0;border:none;',
      'border-radius:999px;cursor:pointer;background:var(--dsw-alias-bg-layer-3);',
      'transition:background .15s ease}',
      '.ec-switch[data-on="true"]{background:var(--dsw-alias-brand-primary)}',
      '.ec-switch-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:999px;',
      'background:var(--dsw-alias-label-primary-foreground);transition:transform .15s ease;display:block}',
      '.ec-switch[data-on="true"] .ec-switch-knob{transform:translateX(16px)}',
      '.ec-button:focus-visible,.ec-icon-button:focus-visible,.ec-ghost-button:focus-visible,',
      '.ec-switch:focus-visible{outline:none;box-shadow:0 0 0 3px var(--dsw-focus-ring-color)}',
      '@media (prefers-reduced-motion: reduce){.ec-fill,.ec-input,.ec-button,.ec-icon-button,',
      '.ec-ghost-button,.ec-switch,.ec-switch-knob{transition:none}}',
    ].join('');

    function injectStyle() {
      try {
        if (document.querySelector('style[data-plugin-css="dsh-earnings-clock"]')) return;
        const style = document.createElement('style');
        style.dataset.plugin = 'dsh-earnings-clock';
        style.dataset.pluginCss = 'dsh-earnings-clock';
        style.textContent = CSS;
        document.head.appendChild(style);
      } catch (error) {
        /* a missing document only means no CSS polish, not a broken dock */
      }
    }

    // ── plugin body ─────────────────────────────────────────────────────────
    function apply(ctx) {
      try {
        if (ctx.effect) {
          ctx.effect(function () {
            return ctx.locale.register(NS, { zh: ZH, en: EN });
          }, 'dsh-earnings-clock: dictionaries');
        } else if (ctx.locale && typeof ctx.locale.register === 'function') {
          ctx.locale.register(NS, { zh: ZH, en: EN });
        }
      } catch (error) {
        /* the local fallback dictionary still renders usable text */
      }

      injectStyle();

      ctx.slots.inject('conversation.input.dock', function () {
        return ctx.slots.register(
          { name: 'conversation.input.dock', id: SECTION_ID, order: 30, locale: NS },
          function (props) {
            return h(EarningsDock, { t: props.t, ctx: ctx });
          },
        );
      });

      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register(
          {
            name: 'settings.section',
            id: SECTION_ID,
            order: 25,
            label: function () {
              return makeT(ctx, undefined)('settings.nav');
            },
            locale: NS,
          },
          function (props) {
            return h(EarningsSettings, { t: props.t, ctx: ctx });
          },
        );
      });

      ctx.slots.inject('settings.section.icon', function () {
        return ctx.slots.register(
          {
            name: 'settings.section.icon',
            id: SECTION_ID,
            order: 25,
            label: function () {
              return makeT(ctx, undefined)('settings.nav');
            },
          },
          NavIcon,
        );
      });
    }

    return {
      inject: ['slots', 'locale'],
      apply: apply,
      // Pure helpers, exposed for the deterministic smoke test.
      __internals: {
        parseTime: parseTime,
        normalize: normalize,
        computeView: computeView,
        formatMoney: formatMoney,
        formatClock: formatClock,
        dictionaries: TEXT,
      },
    };
  },
});
