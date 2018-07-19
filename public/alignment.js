import {
  secondInDay,
  totalSecOfDay,
  dateToStr,
} from './date';

export default class Alignment {
  constructor() {
    this.canvasWidth = 1024;
    this.paddingLeft = 100;
    this.align = {
      first: '',
      second: '',
      alignment: 1,
    };
    this.alignParams = [];
  }

  setAlign(first, second, alignment) {
    this.align.first = first;
    this.align.second = second;
    this.align.alignment = alignment;
  }

  isAlignedEvent(type) {
    return this.align.first === type || this.align.second === type;
  }

  convertToX(sec, nthDay) {
    const align = this.alignParams[nthDay];
    const segment = align.segments.find(d => sec >= d.start && sec < d.end);

    let pos = sec * (this.canvasWidth / totalSecOfDay);
    if (!align.alignFailed) {
      pos *= segment.scale;
      pos += segment.offset;
    }

    return pos + this.paddingLeft;
  }

  getAlignParams() {
    return this.alignParams;
  }

  update(eventData, startDate, numDays) {
    if (this.align.first === '') {
      this.calculateAlignParamsNoAlign(numDays);
    } else if (this.align.second === '') {
      this.calculateAlignParamsOneAlign(eventData, startDate, numDays);
    } else {
      switch (this.align.alignment) {
        case 1:
          this.calculateAlignParamsTwoAlignCenter(
            eventData,
            startDate,
            numDays,
          );
          break;
        case 2:
          this.calculateAlignParamsTwoAlignLeft(
            eventData,
            startDate,
            numDays,
          );
          break;
        case 3:
          this.calculateAlignParamsTwoAlignRight(
            eventData,
            startDate,
            numDays,
          );
          break;
        case 4:
          this.calculateAlignParamsTwoAlignJustified(
            eventData,
            startDate,
            numDays,
          );
          break;
        default:
          break;
      }
    }
  }

  calculateAlignParamsNoAlign(numDays) {
    this.alignParams = [];
    for (let i = 0; i < numDays; i += 1) {
      this.alignParams.push({
        segments: [{
          start: 0,
          end: totalSecOfDay + 1,
          offset: 0.0,
          scale: 1.0,
        }],
        alignFailed: false,
      });
    }
  }

  calculateAlignParamsOneAlign(eventData, startDate, numDays) {
    this.alignParams = [];
    for (let i = 0; i < numDays; i += 1) {
      const day = moment(startDate);
      day.add(i, 'days');
      const {
        events,
      } = eventData[dateToStr(day)];

      let eventFound = false;
      let offset = 0;
      for (let j = 0; j < events.length; j += 1) {
        if (events[j].Meal === this.align.first) {
          eventFound = true;
          const x = secondInDay(events[j].time) * (this.canvasWidth /
            totalSecOfDay);
          offset = (this.canvasWidth / 2) - x;
          break;
        }
      }

      this.alignParams.push({
        segments: [{
          start: 0,
          end: totalSecOfDay + 1,
          offset,
          scale: 1.0,
        }],
        alignFailed: !eventFound,
      });
    }
  }

  calculateAlignParamsTwoAlignCenter(eventData, startDate, numDays) {
    this.alignParams = [];
    for (let i = 0; i < numDays; i += 1) {
      const day = moment(startDate);
      day.add(i, 'days');
      const {
        events,
      } = eventData[dateToStr(day)];

      let x1 = 0;
      let x2 = 0;
      let foundEvent1 = false;
      let foundEvent2 = false;

      for (let j = 0; j < events.length; j += 1) {
        if (events[j].Meal === this.align.first) {
          foundEvent1 = true;
          x1 = (secondInDay(events[j].time) * (this.canvasWidth /
            totalSecOfDay));
          break;
        }
      }
      for (let j = 0; j < events.length; j += 1) {
        if (events[j].Meal === this.align.second) {
          foundEvent2 = true;
          x2 = (secondInDay(events[j].time) * (this.canvasWidth /
            totalSecOfDay));
          break;
        }
      }

      let scale = 1;
      let offset = 0;

      if (foundEvent1 && foundEvent2) {
        scale = 1;
        offset = (0.5 * this.canvasWidth) - (((x1 + x2) / 2) * scale);
        this.alignParams.push({
          segments: [{
            start: 0,
            end: totalSecOfDay,
            offset,
            scale: 1.0,
          }],
          alignFailed: false,
        });
      } else if (foundEvent1) {
        scale = 1;
        offset = (0.5 * this.canvasWidth) - (x1 * scale);
        this.alignParams.push({
          segments: [{
            start: 0,
            end: totalSecOfDay,
            offset,
            scale: 1.0,
          }],
          alignFailed: false,
        });
      } else if (foundEvent2) {
        scale = 1;
        offset = (0.5 * this.canvasWidth) - (x2 * scale);
        this.alignParams.push({
          segments: [{
            start: 0,
            end: totalSecOfDay,
            offset,
            scale,
          }],
          alignFailed: false,
        });
      } else {
        scale = 1;
        offset = 0;
        this.alignParams.push({
          segments: [{
            start: 0,
            end: totalSecOfDay,
            offset,
            scale,
          }],
          alignFailed: true,
        });
      }
    }
  }

  calculateAlignParamsTwoAlignLeft(eventData, startDate, numDays) {
    this.alignParams = [];
    const list = [];
    for (let i = 0; i < numDays; i += 1) {
      const day = moment(startDate);
      day.add(i, 'days');
      const {
        events,
      } = eventData[dateToStr(day)];

      let x1 = 0;
      let x2 = 0;
      let sec1 = 0;
      let sec2 = 0;
      let foundEvent1 = false;
      let foundEvent2 = false;

      const e1 = events.find(d => d.Meal === this.align.first);
      if (e1) {
        foundEvent1 = true;
        sec1 = secondInDay(e1.time);
        x1 = sec1 * (this.canvasWidth / totalSecOfDay);
      }

      const e2 = events.find(d => d.Meal === this.align.second);
      if (e2) {
        foundEvent2 = true;
        sec2 = secondInDay(e2.time);
        x2 = sec2 * (this.canvasWidth / totalSecOfDay);
      }

      list.push({
        x1,
        x2,
        sec1,
        sec2,
        foundEvent1,
        foundEvent2,
      });
    }

    let maxXSpan = 0;
    maxXSpan = list.reduce((max, d) => {
      if (d.foundEvent1 && d.foundEvent2) {
        const span = Math.abs(d.x2 - d.x1);
        if (span > max) {
          return span;
        }
      }
      return max;
    }, 0);

    let scale = 1;
    if (maxXSpan > 0) {
      scale = (0.5 * this.canvasWidth) / maxXSpan;
    }

    for (let i = 0; i < numDays; i += 1) {
      let offset = 0;
      let alignFailed = true;

      if (list[i].foundEvent1 && list[i].foundEvent2) {
        offset = (0.25 * this.canvasWidth) - (list[i].x1 * scale);
        alignFailed = false;

        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: list[i].sec1,
              offset: (0.25 * this.canvasWidth) - list[i].x1,
              scale: 1,
            },
            {
              start: list[i].sec1,
              end: list[i].sec2,
              offset,
              scale,
            },
            {
              start: list[i].sec2,
              end: totalSecOfDay,
              offset: (0.75 * this.canvasWidth) - list[i].x2,
              scale: 1,
            },
          ],
          gap: {
            start: (list[i].x2 * scale) + offset,
            end: 0.75 * this.canvasWidth,
          },
          alignFailed,
        });
      } else if (list[i].foundEvent1) {
        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: totalSecOfDay,
              offset: (0.25 * this.canvasWidth) - list[i].x1,
              scale: 1,
            },
          ],
          alignFailed: false,
        });
      } else if (list[i].foundEvent2) {
        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: totalSecOfDay,
              offset: (0.75 * this.canvasWidth) - list[i].x2,
              scale: 1,
            },
          ],
          alignFailed: false,
        });
      } else {
        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: totalSecOfDay,
              offset: 0,
              scale: 1,
            },
          ],
          alignFailed: true,
        });
      }
    }
  }

  calculateAlignParamsTwoAlignRight(eventData, startDate, numDays) {
    this.alignParams = [];
    const list = [];
    for (let i = 0; i < numDays; i += 1) {
      const day = moment(startDate);
      day.add(i, 'days');
      const {
        events,
      } = eventData[dateToStr(day)];

      let x1 = 0;
      let x2 = 0;
      let sec1 = 0;
      let sec2 = 0;
      let foundEvent1 = false;
      let foundEvent2 = false;

      const e1 = events.find(d => d.Meal === this.align.first);
      if (e1) {
        foundEvent1 = true;
        sec1 = secondInDay(e1.time);
        x1 = sec1 * (this.canvasWidth / totalSecOfDay);
      }

      const e2 = events.find(d => d.Meal === this.align.second);
      if (e2) {
        foundEvent2 = true;
        sec2 = secondInDay(e2.time);
        x2 = sec2 * (this.canvasWidth / totalSecOfDay);
      }

      list.push({
        x1,
        x2,
        sec1,
        sec2,
        foundEvent1,
        foundEvent2,
      });
    }

    let maxXSpan = 0;
    maxXSpan = list.reduce((max, d) => {
      if (d.foundEvent1 && d.foundEvent2) {
        const span = Math.abs(d.x2 - d.x1);
        if (span > max) {
          return span;
        }
      }
      return max;
    }, 0);

    let scale = 1;
    if (maxXSpan > 0) {
      scale = (0.5 * this.canvasWidth) / maxXSpan;
    }

    for (let i = 0; i < numDays; i += 1) {
      let offset = 0;

      if (list[i].foundEvent1 && list[i].foundEvent2) {
        offset = (0.75 * this.canvasWidth) - (list[i].x2 * scale);
        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: list[i].sec1 + 1,
              offset: (0.25 * this.canvasWidth) - list[i].x1,
              scale: 1,
            },
            {
              start: list[i].sec1 + 1,
              end: list[i].sec2,
              offset,
              scale,
            },
            {
              start: list[i].sec2,
              end: totalSecOfDay,
              offset: (0.75 * this.canvasWidth) - list[i].x2,
              scale: 1,
            },
          ],
          gap: {
            end: (list[i].x1 * scale) + offset,
            start: 0.25 * this.canvasWidth,
          },
          alignFailed: false,
        });
      } else if (list[i].foundEvent1) {
        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: totalSecOfDay,
              offset: (0.25 * this.canvasWidth) - list[i].x1,
              scale: 1,
            },
          ],
          alignFailed: false,
        });
      } else if (list[i].foundEvent2) {
        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: totalSecOfDay,
              offset: (0.75 * this.canvasWidth) - list[i].x2,
              scale: 1,
            },
          ],
          alignFailed: false,
        });
      } else {
        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: totalSecOfDay,
              offset: 0,
              scale: 1,
            },
          ],
          alignFailed: true,
        });
      }
    }
  }

  calculateAlignParamsTwoAlignJustified(eventData, startDate, numDays) {
    this.alignParams = [];
    for (let i = 0; i < numDays; i += 1) {
      const day = moment(startDate);
      day.add(i, 'days');
      const {
        events,
      } = eventData[dateToStr(day)];

      let sec1 = 0;
      let sec2 = 0;
      let x1 = 0;
      let x2 = 0;
      let foundEvent1 = false;
      let foundEvent2 = false;

      for (let j = 0; j < events.length; j += 1) {
        if (events[j].Meal === this.align.first) {
          foundEvent1 = true;
          sec1 = secondInDay(events[j].time);
          x1 = (sec1 * (this.canvasWidth / totalSecOfDay));
          break;
        }
      }
      for (let j = 0; j < events.length; j += 1) {
        if (events[j].Meal === this.align.second) {
          foundEvent2 = true;
          sec2 = secondInDay(events[j].time);
          x2 = (sec2 * (this.canvasWidth / totalSecOfDay));
          break;
        }
      }

      let scale = 1;
      let offset = 0;

      if (foundEvent1 && foundEvent2) {
        scale = (0.5 * this.canvasWidth) / (x2 - x1);
        offset = (0.25 * this.canvasWidth) - (x1 * scale);
        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: sec1 + 1,
              offset: (0.25 * this.canvasWidth) - x1,
              scale: 1,
            },
            {
              start: sec1 + 1,
              end: sec2,
              offset,
              scale,
            },
            {
              start: sec2,
              end: totalSecOfDay,
              offset: (0.75 * this.canvasWidth) - x2,
              scale: 1,
            },
          ],
          alignFailed: !(foundEvent1 && foundEvent2),
        });
      } else if (foundEvent1) {
        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: totalSecOfDay,
              offset: (0.25 * this.canvasWidth) - x1,
              scale: 1,
            },
          ],
          alignFailed: false,
        });
      } else if (foundEvent2) {
        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: totalSecOfDay,
              offset: (0.75 * this.canvasWidth) - x2,
              scale: 1,
            },
          ],
          alignFailed: false,
        });
      } else {
        this.alignParams.push({
          segments: [
            {
              start: 0,
              end: totalSecOfDay,
              offset: 0,
              scale: 1,
            },
          ],
          alignFailed: true,
        });
      }
    }
  }
}

export {
  Alignment,
};
