import {
  dateToStr,
  secondInDay,
} from './date';

export default class GlucoseVisualization {
  constructor(alignment) {
    this.colors = ['#8a84c8', '#c986bb', '#82d6c3', '#d95f02','#ffa200' ,'#999999']; // five-color scheme
    // this.colors = ['#ffbb51', '#73b985', '#ff6567', '#999999'];
    //this.colors = ['#8a84c8', '#82d6c3', '#d95f02', '#999999']; // color-blindness safe
    this.container = $('#vis-canvas-container');
    this.canvas = d3.select('#vis-canvas');
    this.tooltip = d3.select('#tooltip');
    this.navBarHeight = 72;

    this.startDate = null;
    this.numDays = 14;

    this.alignment = alignment;

    this.inDetailView = "";
  }

  static removeDataInSecs(data, secAround) {
    const events = [];
    let lastEvent = null;

    data.forEach((evt) => {
      const traceBackTime = moment(evt.time).subtract(secAround, 'seconds');
      if (lastEvent === null) {
        lastEvent = evt;
        events.push(evt);
      } else if (lastEvent.time.isBefore(traceBackTime)) {
        lastEvent = evt;
        events.push(evt);
      }
    });

    return events;
  }

  coalesceGlucoseData() {
    const days = Object.keys(this.glucoseData);
    days.forEach((day) => {
      const dayData = this.glucoseData[day].events;
      this.glucoseData[day].events =
        GlucoseVisualization.removeDataInSecs(dayData, 480);
    });
  }

  setData(glucoseData, eventData) {
    // this.glucoseData = JSON.parse(JSON.stringify(glucoseData));
    this.glucoseData = Object.assign({}, glucoseData);

    const days = Object.keys(glucoseData);
    days.forEach((day) => {
      const dayData = this.glucoseData[day];
      this.glucoseData[day] = Object.assign({}, dayData);
    });

    this.coalesceGlucoseData();
    this.eventData = eventData;
  }

  setStartDate(day) {
    this.startDate = day;
  }

  setDetailedVis(detailedVis) {
    this.detailedVis = detailedVis;
  }

  resize() {
    this.width = this.container.width();
    this.height = ($(window).height() - this.navBarHeight) * 0.75; //0.75
    this.paddingForDate = 100;

    this.container.height(this.height);
    this.canvas
      .attr('width', this.width)
      .attr('height', this.height);
    this.alignment.canvasWidth = this.width - this.paddingForDate;
    this.alignment.paddingLeft = this.paddingForDate;

    this.render();
  }

  render() {
    this.alignment.update(this.eventData, this.startDate, this.numDays);
    this.visualizeMultipleDays(this.startDate, this.numDays);
  }

  visualizeMultipleDays(start, numDays) {
    const heightPerDay = this.height / numDays;

    const daysData = this.filterDaysData(start, numDays);

    const dayGroups = this.canvas.selectAll('.day-vis')
      .data(daysData, d => d.date);
    dayGroups.exit().remove();
    const dayGroupsEnter = dayGroups.enter()
      .append('g')
      .attr('class', 'day-vis')
      .attr('date', d => d.date);
    dayGroupsEnter.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.width)
      .attr('height', heightPerDay)
      .attr('fill', '#000')
      .attr('opacity', 0.0)
      .on('mouseover', (d, i, nodes) => {
        d3.select(nodes[i]).attr('opacity', 0.05);
      })
      .on('mouseout', (d, i, nodes) => {
        if (this.inDetailView !== d.date) {
          d3.select(nodes[i]).attr('opacity', 0.00);
        }
      })
      .on('click', (d, i, nodes) => {
        this.inDetailView = d.date;
        // console.log(dayGroups);

        // dayGroups.attr('opacity', 0);
        dayGroupsEnter.select('rect').attr('opacity', 0);

        d3.select(nodes[i]).attr('opacity', 0.05);

        this.detailedVis.setDate(moment(d.date));
        this.detailedVis.render();
        d3.select('.detailed-date-legend').html(d.date);
      });
    dayGroupsEnter.append('g')
      .attr('class', 'time-ticks');
    dayGroupsEnter.each((d, i, dom) => {
      GlucoseVisualization.showDate(d.date, d3.select(dom[i]), heightPerDay / 2);
    });

    dayGroupsEnter.merge(dayGroups)
      .transition()
      .attr('transform', (d, i) => `translate(0, ${heightPerDay * i})`)
      .each((d, i, dom) => {
        this.visualizeDay(d.date, d3.select(dom[i]), i, heightPerDay / 2);
      });
  }

  filterDaysData(start, numDays) {
    const daysData = [];
    for (let i = 0; i < numDays; i += 1) {
      const day = moment(start);
      day.add(i, 'days');
      const dayStr = dateToStr(day);
      const dayData = this.glucoseData[dayStr];

      if (dayData) {
        daysData.push(dayData);
      }
    }
    return daysData;
  }

  visualizeDay(day, canvas, nthDay, yOffset = 0) {
    this.visualizeDayGlucose(day, canvas, nthDay, yOffset);
    this.visualizeDayEvent(day, canvas, nthDay, yOffset);
    this.showTimeTicks(canvas.select('.time-ticks'), nthDay, yOffset);
  }

  static showDate(day, canvas, yOffset = 0) {
    canvas.attr('text-anchor', 'start')
      .attr('dominant-baseline', 'central');
    canvas.append('text')
      .attr('class', 'date')
      .attr('transform', `translate(8, ${yOffset})`)
      .text(day)
      .attr('font-size', '0.75em');
  }

  showTimeTicks(canvas, nthDay, yOffset = 0) {
    const numTicks = 12;
    const numHoursPerLabel = 24 / numTicks;
    const ticks = [];
    for (let i = 0; i <= numTicks; i += 1) {
      ticks.push({
        label: `${i * numHoursPerLabel}:00`,
        sec: i * numHoursPerLabel * 3600,
      });
    }
    ticks[numTicks].sec -= 1; // Exact 24:00 will cause problem in alignment

    const tickLines = canvas.selectAll('.time-tick')
      .data(ticks, d => d.label);
    const tickLinesEnter = tickLines.enter()
      .append('g')
      .attr('class', 'time-tick')
      .attr('font-size', 10)
      .attr('font-family', 'sans-serif')
      .attr('text-anchor', 'middle')
      .attr('transform', d => `translate(${this.alignment.convertToX(d.sec, nthDay)}, ${yOffset})`);
    tickLinesEnter.append('line')
      .attr('y1', '-3')
      .attr('y2', '3')
      .attr('stroke', '#000');
    tickLinesEnter.append('text')
      .attr('fill', '#000')
      .attr('y', 9)
      .text(d => d.label);

    tickLinesEnter.merge(tickLines)
      .transition()
      .attr('transform', d => `translate(${this.alignment.convertToX(d.sec, nthDay)}, ${yOffset})`);
  }

  visualizeDayGlucose(day, canvas, nthDay, yOffset = 0) {
    const dayData = this.glucoseData[day].events;

    const circle = canvas.selectAll('circle').data(dayData);
    const circleEnter = circle.enter().append('circle')
      .attr('r', 2)
      .attr('cy', yOffset);
    const alignParam = this.alignment.getAlignParams()[nthDay];


    circleEnter.merge(circle)
      .transition()
      .attr('cx', d => this.alignment.convertToX(secondInDay(d.time), nthDay))
      .attr('cy', d => yOffset - ((d.value / 30) + 0))
      .attr('fill', (d) => {
          if (d.value > 250) return this.colors[0];
          if (d.value > 180) return this.colors[1];
          if (d.value > 70) return this.colors[2];
          if (d.value > 54) return this.colors[3];
          if (d.value > 0) return this.colors[4];
          return this.colors[5];

        // if (d.value > 180) return this.colors[0];
        // else if (d.value > 70) return this.colors[1];
        // else if (d.value > 0) return this.colors[2];
        // return this.colors[3];
      })
      .attr('opacity', () => {
        if (alignParam.alignFailed) return 0.5;
        return 1.0;
      });
  }

  static createTooltipContent(event) {
    return `
          <b>Meal</b>: ${event.Meal} - ${event.WhatEating} </br>
          <b>Carbs</b>: ${Number.isNaN(event.MealCarbs) ? "Not Available" : event.MealCarbs}</br>
          <b>Caregiver</b>: ${event.Caregiver} </br>
          <b>Glucose</b>: ${event.Glucose} </br>
          <b>Humalog</b>: ${Number.isNaN(event.Humalog) ? "Not Available" : event.Humalog} </br>
          <b>Notes</b>: ${event.Notes} </br>
          <b>Time</b>: ${event.time}
    `;
  }

  visualizeDayEvent(day, canvas, nthDay, yOffset = 0) {
    const evtDayData = this.eventData[day].events;

    const rect = canvas.selectAll('path').data(evtDayData);
    const alignParam = this.alignment.getAlignParams()[nthDay];

    const rectEnter = rect.enter().append('path')
      .attr('d', d3.symbol().type(d3.symbolTriangle))
      .attr('class', 'event')
      .attr('transform', `translate(0, ${yOffset})`)
      .attr('fill', (d) => {
        if (d.Meal && this.alignment.isAlignedEvent(d.Meal)) {
          // return '#ef720b';
          return '#1c5c14';
        }
        return '#1583ea';
      })
      .on('mouseover', (d) => {
        const tooltipContent = GlucoseVisualization.createTooltipContent(d);
        this.tooltip
          .html(tooltipContent)
          .style('left', `${d3.event.pageX + 15}px`)
          .style('top', `${d3.event.pageY - 28}px`)
          .style('opacity', 1);
        this.highlightEventType(d.Meal);
      })
      .on('mouseout', () => {
        this.tooltip
          .style('opacity', 0)
          .style('left', '-1000px')
          .style('top', '-1000px');
        this.highlightEventType(null);
      })
      .on('click', (d) => {
        this.detailedVis.render(d.time);
      });

    rectEnter.merge(rect)
      .transition()
      .attr('fill', (d) => {
        if (d.Meal && this.alignment.isAlignedEvent(d.Meal)) {
          //return '#ef720b';
          return '#1c5c14';
        }
        return '#1583ea';
      })
      .attr('opacity', () => {
        if (alignParam.alignFailed) return 0.5;
        return 1.0;
      })
      .attr('stroke-opacity', () => {
        if (alignParam.alignFailed) return 0.5;
        return 1.0;
      })
      .attr('transform', d => `translate(${this.alignment.convertToX(secondInDay(d.time), nthDay)}, ${yOffset})`);

    this.visualizeDataGap(day, canvas, nthDay, yOffset);
  }

  visualizeDataGap(day, canvas, nthDay, yOffset = 0) {
    const align = this.alignment.getAlignParams()[nthDay];
    canvas.selectAll('.gap').remove();
    if (!align.gap) return;
    if (align.alignFailed) return;
    if (align.gap.start > align.gap.end) return;
    canvas.append('g')
      .attr('class', 'gap')
      .selectAll('rect').data([align])
      .enter()
      .append('rect')
      .attr('x', (d) => {
        if (!d.gap) return 0;
        return d.gap.start + this.paddingForDate;
      })
      .attr('width', (d) => {
        if (!d.gap) return 0;
        return d.gap.end - d.gap.start;
      })
      .attr('height', 10)
      .attr('y', yOffset - 5)
      .attr('opacity', 0.3);
  }

  highlightEventType(eventType) {
    this.canvas.selectAll('g').selectAll('.event')
      .style('opacity', (d) => {
        if (!eventType) {
          return 1;
        }

        if (eventType === d.Meal) {
          return 1;
        }

        return 0.2;
      });
  }
}

export {
  GlucoseVisualization,
};
