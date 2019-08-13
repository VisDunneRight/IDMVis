(function () {
'use strict';

function dateToStr(date) {
  return date.format('YYYY-MM-DD');
}

function secondInDay(datetime) {
  const hourToSec = datetime.hour() * 3600;
  const minToSec = datetime.minute() * 60;
  const secToSec = datetime.second();
  return hourToSec + minToSec + secToSec;
}

const totalSecOfDay = 86400;

class GlucoseVisualization {
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

function groupDataInDays(data) {
  const organizedData = {};

  const day = moment(data[0].time);
  day.hour(0);
  day.minute(0);
  day.second(0);
  day.millisecond(0);
  while (day < data[data.length - 1].time) {
    const dayStr = dateToStr(day);
    organizedData[dayStr] = {
      date: dayStr,
      events: [],
    };
    day.add(1, 'days');
  }

  data.forEach((d) => {
    const date = moment(d.time);
    const dateStr = dateToStr(date);
    organizedData[dateStr].events.push(d);
  });

  return organizedData;
}

function getDataInDays(allData, start, numDays) {
  const data = [];
  const day = moment(start);
  for (let i = 0; i < numDays; i += 1) {
    const dayStr = dateToStr(day);
    const dayData = allData[dayStr];
    if (dayData !== undefined) {
      data.push(allData[dayStr]);
    }
    day.add(1, 'days');
  }
  return data;
}

function preprocessGlucoseData(data) {
  let filteredData = data;
  filteredData = filteredData.filter(d => d.source === 'nightscout');
  filteredData.forEach((d) => {
    const entry = d;
    entry.time = moment(entry.time);
    entry.value = parseFloat(entry.glucoseReading);
  });

  const glucoseOrgData = groupDataInDays(filteredData);
  const firstData = filteredData[0];
  const lastData = filteredData[filteredData.length - 1];

  return { glucoseOrgData, firstData, lastData };
}

function preprocessEventData(data) {
  data.forEach((d) => {
    const entry = d;
    entry.time = moment(entry.time);
    entry.Humalog = parseFloat(entry.Humalog);
    entry.Glucose = parseFloat(entry.Glucose);
    entry.MealCarbs = parseFloat(entry.MealCarbs);
  });

  return groupDataInDays(data);
}

function preprocessBasalData(data) {
  data.forEach((d) => {
    const entry = d;
    entry.time = moment(entry.deviceTime);
    entry.Rate = parseFloat(entry.Rate);
    entry.duration = parseFloat(entry.duration);
    entry.amount = parseFloat(entry.amount);
  });
  const orgData = groupDataInDays(data);
  return orgData;
}

function preprocessBolusData(data) {
  data.forEach((d) => {
    const entry = d;
    entry.time = moment(entry.deviceTime);
    entry.normal = parseFloat(entry.normal);
  });

  const orgData = groupDataInDays(data);
  const days = Object.keys(orgData);
  days.forEach((day) => {
    const dayData = orgData[day];
    dayData.dayBolus = dayData.events.reduce(
      (sum, item) => sum + item.normal,
      0,
    );
  });

  return orgData;
}

class ViolinPlot {
  constructor(canvas, xCenter, width, yMin, yMax, domain, numBins = 10) {
    this.canvas = canvas;
    this.xCenter = xCenter;
    this.width = width;
    this.yMin = yMin;
    this.yMax = yMax;
    this.height = this.yMax - this.yMin;
    this.domain = domain;
    this.numBins = numBins;

    this.canvas.select('text').attr('opacity', 0);

    this.histogramThresholds();
  }

  histogramThresholds() {
    const stepSize = (this.domain[1] - this.domain[0]) / this.numBins;

    // Starting points are included twice intentionally. We want the first bin
    // to have a count of 0.
    this.thresholds = [this.domain[0] - (0.001 * stepSize)];

    for (let i = 0; i < this.numBins; i += 1) {
      this.thresholds.push(this.domain[0] + (i * stepSize));
    }
    this.thresholds.push(this.domain[1]);
    this.thresholds.push(this.domain[1] + (0.001 * stepSize));
  }

  turnOnNoData() {
    this.canvas.select('text').attr('opacity', '0.6');
  }

  turnOffNoData() {
    this.canvas.select('text').attr('opacity', '0');
  }

  static violinColor(hasData = true) {
    if (hasData) return '#999999';
    return '#eeeeee';
  }

  render(data, accessor) {
    if (data.length === 0) {
      this.turnOnNoData();
    } else {
      this.turnOffNoData();
    }

    const histData = d3.histogram()
      .value(accessor)
      .domain([this.thresholds[0], this.thresholds[this.thresholds.length - 1]])
      .thresholds(this.thresholds)(data);

    let maxY = d3.max(histData, d => d.length);
    if (maxY === undefined || Number.isNaN(maxY)) maxY = 0;

    const xScale = d3.scaleLinear()
      .domain(this.domain)
      .range([0, this.height]);
    const yScale = d3.scaleLinear()
      .domain([0, maxY])
      .range([this.width / 2, 0]);

    const line = d3.line()
      .curve(d3.curveBasis)
      .x(d => xScale((d.x0 + d.x1) / 2))
      .y(d => yScale(d.length));

    this.canvas.attr('transform', `translate(${this.xCenter}, ${this.yMin})`);

    this.canvas.selectAll('g').remove();

    const leftHalf = this.canvas.append('g')
      .attr('transform', `rotate(-90)translate(${-this.height}, 0)`);
    leftHalf.append('path')
      .datum(histData)
      .attr('d', line)
      .attr('class', 'line')
      .style('stroke', ViolinPlot.violinColor(data.length !== 0))
      .style('fill', ViolinPlot.violinColor(data.length !== 0));

    const rightHalf = this.canvas.append('g')
      .attr(
        'transform',
        `rotate(-90)scale(1,-1)translate(${-this.height}, ${-this.width + 1})`,
      );
    rightHalf.append('path')
      .datum(histData)
      .attr('d', line)
      .attr('class', 'line')
      .style('stroke', ViolinPlot.violinColor(data.length !== 0))
      .style('fill', ViolinPlot.violinColor(data.length !== 0));

    this.drawTicks(data, accessor, this.canvas);
  }

  drawTicks(data, accessor, container) {
    const xScale = d3.scaleLinear()
      .domain(this.domain)
      .range([this.height, 0]);
    data.sort((a, b) => accessor(a) - accessor(b));
    let axisTicks = [
      {
        text: '',
        pos: 0.0,
        value: this.domain[0],
      },
      {
        text: '',
        pos: 1.0,
        value: this.domain[1],
      },
      {
        text: '25%',
        pos: 0.25,
        value: d3.quantile(data, 0.25, accessor),
      },
      {
        text: 'median',
        pos: 0.50,
        value: d3.quantile(data, 0.5, accessor),
      },
      {
        text: '75%',
        pos: 0.75,
        value: d3.quantile(data, 0.75, accessor),
      },
    ];
    axisTicks = axisTicks.filter(d => d.value !== undefined &&
      !Number.isNaN(d.value));
    axisTicks.sort((a, b) => a.value - b.value);

    container.selectAll('.axis').remove();
    const ticksContainer = container.append('g')
      .attr('class', 'axis')
      .attr('font-size', 10)
      .attr('font-family', 'sans-serif')
      .attr('text-anchor', 'start')
      .attr('transform', `translate(${this.width / 2}, 0)`);

    if (axisTicks.length === 5) {
      ticksContainer.append('rect')
        .attr('x', -3)
        .attr('width', 6)
        .attr('y', xScale(axisTicks[3].value))
        .attr('height', xScale(axisTicks[1].value) - xScale(axisTicks[3].value))
        .attr('fill', '#fff')
        .attr('stroke', '#000');
    }


    const ticks = ticksContainer.selectAll('g').data(axisTicks);
    const tickGroup = ticks.enter()
      .append('g');
    // .attr('transform', d => `translate(0, ${xScale(d.value)})`);
    tickGroup.append('text')
      .attr('text-anchor', 'end')
      .attr('fill', '#000')
      .attr('x', -15)
      .attr('y', d => (1 - d.pos) * this.height)
      .attr('dy', '0.32em')
      .text(d => `${d.text}`);
    tickGroup.append('line')
      .attr('stroke', '#000')
      .attr('stroke-width', '0.5')
      .attr('x1', -9)
      .attr('x2', -3)
      .attr('y1', d => (1 - d.pos) * this.height)
      .attr('y2', d => xScale(d.value));
    tickGroup.append('line')
      .attr('stroke', '#000')
      .attr('stroke-width', '2')
      .attr('x1', -3)
      .attr('x2', 3)
      .attr('y1', d => xScale(d.value))
      .attr('y2', d => xScale(d.value));
    tickGroup.append('line')
      .attr('stroke', '#000')
      .attr('stroke-width', '0.5')
      .attr('x1', 3)
      .attr('x2', 9)
      .attr('y1', d => xScale(d.value))
      .attr('y2', d => (1 - d.pos) * this.height);
    tickGroup.append('text')
      .attr('fill', '#000')
      .attr('x', 15)
      .attr('y', d => (1 - d.pos) * this.height)
      .attr('dy', '0.32em')
      .text(d => `${d.value.toFixed(1)}`);
  }
}

class SummaryVisualization {
  constructor() {
    this.container = $('#summary-container');
    this.canvas = d3.select('#stat-canvas');
    this.navBarHeight = 72;

    this.startDate = null;
    this.numDays = 14;

    this.basalChart = null;
    this.bolusChart = null;
    this.BreakfastHumalogChart = null;
    this.LunchHumalogChart = null;
    this.DinnerHumalogChart = null;
    this.SugarHumalogChart = null;
    this.BedtimeHumalogChart = null;
    this.BreakfastMealCarbsChart = null;
    this.LunchMealCarbsChart = null;
    this.DinnerMealCarbsChart = null;
    this.SugarMealCarbsChart = null;
    this.BedtimeMealCarbsChart = null;
  }

  setData(eventData, basalData, bolusData) {
    this.eventData = eventData;
    this.basalData = basalData;
    this.bolusData = bolusData;
  }

  setStartDate(day) {
    this.startDate = day;
  }

  resize() {
    this.width = this.container.width();
    this.height = $(window).height() - this.navBarHeight;
    this.container.height(this.height);
    this.canvas
      .attr('width', this.width)
      .attr('height', this.height);

    this.render();
  }

  render() {
    this.renderBasal();
    this.renderBolus();

    this.renderMealsInsulin();
  }

  renderBasal() {
    const dayData = this.getDataInDays(this.basalData);
    const filteredData = SummaryVisualization.dayArrayToEventArray(dayData);

    if (this.basalChart === null) {
      this.basalChart = new ViolinPlot(
        this.canvas.select('#basal-violin'),
        150, 50, 20, 220, [0, 20], 10,
      );
    }

    this.basalChart.render(filteredData, d => d.amount);
  }

  getDataInDays(allData) {
    return getDataInDays(allData, this.startDate, this.numDays);
  }

  static dayArrayToEventArray(dayArray) {
    let data = [];
    data = dayArray.reduce((eventArray, dayData) => eventArray.concat(dayData
      .events), []);
    return data;
  }

  renderBolus() {
    const filteredBolusData = this.getDataInDays(this.bolusData);

    if (this.bolusChart === null) {
      this.bolusChart = new ViolinPlot(
        this.canvas.select('#bolus-violin'),
        300, 50, 20, 220, [0, 20], 10,
      );
    }

    this.bolusChart.render(filteredBolusData, d => d.dayBolus);
  }

  renderMealsInsulin() {
    const dayData = this.getDataInDays(this.eventData);
    const filteredData = SummaryVisualization.dayArrayToEventArray(dayData);

    let y = 340; //350
    this.renderMeal(filteredData, 'Breakfast', 'Humalog', 50, y);
    this.renderMeal(filteredData, 'Lunch', 'Humalog', 140, y);
    this.renderMeal(filteredData, 'Dinner', 'Humalog', 230, y);
    this.renderMeal(filteredData, 'Sugar to treat', 'Humalog', 320, y);
    this.renderMeal(filteredData, 'Bedtime snack', 'Humalog', 410, y);

    y = 590; //600
    this.renderMeal(filteredData, 'Breakfast', 'MealCarbs', 50, y, [0, 100]);
    this.renderMeal(filteredData, 'Lunch', 'MealCarbs', 140, y, [0, 100]);
    this.renderMeal(filteredData, 'Dinner', 'MealCarbs', 230, y, [0, 100]);
    this.renderMeal(
      filteredData, 'Sugar to treat', 'MealCarbs',
      320, y, [0, 100],
    );
    this.renderMeal(
      filteredData, 'Bedtime snack', 'MealCarbs',
      410, y, [0, 100],
    );
  }

  renderMeal(data, meal, type, x, y, range = [0, 4]) {
    const mName = meal.split(' ')[0];
    const filteredMealData = data.filter(d =>
      d.Meal === meal && d[type] !== 0);
    let chart = this[`${mName}${type}Chart`];
    if (chart === null) {
      this[`${mName}${type}Chart`] = new ViolinPlot(
        this.canvas.select(`#${mName}-${type}-violin`),
        x, 50, y, y + 150, range,
      );
      chart = this[`${mName}${type}Chart`];
    }
    chart.render(filteredMealData, d => d[type]);
  }
}

class DetailedVisualization {
  constructor(glucoseData, eventData, basalData, bolusData) {
    // this.colors = ['#ffbb51', '#73b985', '#ff6567', '#999999'];
    this.colors = ['#8a84c8', '#82d6c3', '#d95f02', '#999999'];

    this.container = $('#detailed-canvas-container');
    this.canvas = d3.select('#detailed-canvas');
    this.width = 1000;
    this.navBarHeight = 72;
    this.paddingTop = 10;
    this.paddingBottom = 20;
    this.paddingLeft = 30;
    this.paddingRight = 10;
    this.plotHeight = 250;
    this.plotWidth = 890;
    this.MaxGlucose = 400;
    this.MinGlucose = 0;

    this.glucoseData = glucoseData;
    this.eventData = eventData;
    this.basalData = basalData;
    this.bolusData = bolusData;

    this.updateCanvasSize();
    this.updateScales();
    this.drawAxis();

    this.canvas.append('g')
      .attr('class', 'basal-level');
    this.canvas.append('g')
      .attr('class', 'bolus-level');
  }

  updateCanvasSize() {
    this.width = this.container.width();
    this.height = ($(window).height() - this.navBarHeight) * 0.25;
    this.plotWidth = this.width - this.paddingLeft - this.paddingRight;
    this.plotHeight = this.height - this.paddingTop - this.paddingBottom;
    this.container.height(this.height);
    this.canvas
      .attr('width', this.width)
      .attr('height', this.height);
  }

  updateScales() {
    this.scaleX = d3.scaleLinear()
      .domain([0, totalSecOfDay])
      .range([this.paddingLeft, this.paddingLeft + this.plotWidth]);
    this.scaleY = d3.scaleLinear()
      .domain([this.MinGlucose, this.MaxGlucose])
      .range([this.plotHeight + this.paddingTop, this.paddingTop]);
    this.basalScaleY = d3.scaleLinear()
      .domain([0, 1])
      .range([this.plotHeight + this.paddingTop, this.paddingTop]);
    this.bolusScaleY = d3.scaleLinear()
      .domain([0, 3])
      .range([0, this.plotHeight]);
  }

  drawAxis() {
    this.canvas.selectAll('.axis')
      .remove();

    const scaleXForAxis = d3.scaleLinear()
      .domain([0, 24])
      .range([this.paddingLeft, this.paddingLeft + this.plotWidth]);

    this.canvas.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0, ${this.paddingTop + this.plotHeight})`)
      .call(d3.axisBottom(scaleXForAxis));

    this.canvas.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(${this.paddingLeft}, 0)`)
      .call(d3.axisLeft(this.scaleY));

    this.canvas.append('text')
      // .attr('transform', 'rotate(-90)')
      .attr('y', -3)
      .attr('x', 60)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .attr('font-size', '1em')
      .text('mg/dL');
  }

  setDate(date) {
    this.date = date;
  }

  resize() {
    this.updateCanvasSize();
    this.updateScales();
    this.drawAxis();
    this.render();
  }

  render() {
    if (!this.date) {
      return;
    }

    this.renderGlucose();
    this.renderEvent();
    this.renderBasal();
    this.renderBolus();
  }

  renderGlucose() {
    const dateStr = dateToStr(this.date);
    const glucoseDayData = this.glucoseData[dateStr].events;
    const circle = this.canvas.selectAll('circle')
      .data(glucoseDayData, d => secondInDay(d.time));

    const circleEnter = circle.enter().append('circle')
      .attr('r', 2)
      .on('mouseenter', (d) => {
        const tooltip = d3.select('.detailed-event-tooltip');
        tooltip.selectAll('.value-1')
          .html(`<b>Glucose:</b> ${d.glucoseReading}</br>`);
        tooltip.selectAll('.value-2')
          .html(`<b>Time:</b> ${d.time.format('LT')}</br>`);
        tooltip.transition().style('opacity', 1);
        tooltip
          .style('left', `${d3.event.pageX}px`)
          .style('top', `${d3.event.pageY - 160}px`);
      })
      .on('mousemove', () => {
        const tooltip = d3.select('.detailed-event-tooltip');
        const xy = d3.mouse(d3.select('.detailed-event-tooltip-container').node());
        tooltip
          .style('left', `${xy[0] + 10} px`)
          .style('top', `${xy[1] + 10} px`);
      })
      .on('mouseleave', () => {
        const tooltip = d3.select('.detailed-event-tooltip');
        tooltip.transition().style('opacity', 0);
        tooltip
          .style('left', `-1000px`)
          .style('top', `-1000px`);
      });

    circleEnter.merge(circle)
      .attr('cx', d => this.scaleX(secondInDay(d.time)))
      .attr('cy', this.paddingTop + this.plotHeight)
      .transition()
      .attr('cy', d => this.scaleY(d.glucoseReading))
      .attr('stroke', (d) => {
        // if (d.source === 'tidepool') return 'none';
        // if (d.source === 'nightscout') return 'none';
        if (d.value > 180) return this.colors[0];
        else if (d.value > 70) return this.colors[1];
        else if (d.value > 0) return this.colors[2];
        return this.colors[3];
      })
      .attr('fill', (d) => {
        // if (d.source === 'tidepool') return 'none';
        // if (d.source === 'googlesheet') return '#333';
        // if (d.source === 'nightscout') return 'none';
        if (d.value > 180) return this.colors[0];
        else if (d.value > 70) return this.colors[1];
        else if (d.value > 0) return this.colors[2];
        return this.colors[3];
      });

    circle.exit().remove();
  }

  renderEvent() {
    const dateStr = dateToStr(this.date);
    const eventDayData = this.eventData[dateStr].events;

    const eventSymbols = this.canvas.selectAll('.event-symbol')
      .data(eventDayData, d => d.Meal);
    const eventSymbolsEnter = eventSymbols.enter().append('g')
      .attr('class', 'event-symbol')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .style('font-weight', 'bold')
      .attr('transform', d => `translate(${this.scaleX(secondInDay(d.time))}, ${this.paddingTop + this.plotHeight})`)
      .on('mouseenter', (d) => {
        const tooltip = d3.select('.detailed-tooltip');
        tooltip.selectAll('.value-1')
          .html(`<b>${d.Meal}</b>: ${Number.isNaN(d.MealCarbs) ? "Not Available" : d.MealCarbs} carbs</br>`);
        tooltip.selectAll('.value-2')
          .html(`<b>Glucose:</b> ${d.Glucose}</br>`);
        tooltip.selectAll('.value-3')
          .html(`<b>Food:</b> ${d.WhatEating}</br>`);
        tooltip.selectAll('.value-4')
          .html(`<b>Humalog:</b> ${Number.isNaN(d.Humalog) ? "Not Available" : d.Humalog}</br>`);
        tooltip.selectAll('.value-5')
          .html(`<b>Caregiver:</b> ${d.Caregiver}</br>`);
        tooltip.selectAll('.value-5')
          .html(`<b>Notes:</b> ${d.Notes}</br>`);
        tooltip.selectAll('.value-7')
          .html(`<b>Time:</b> ${d.time.format('LLL')}</br>`);
        tooltip.transition().style('opacity', 1);
        tooltip
          // .style('left', `20px`)
          // .style('top', `580px`);
          .style('left', `${d3.event.pageX}px`)
          .style('top', `${d3.event.pageY - 250}px`);
      })
      .on('mousemove', () => {
        const tooltip = d3.select('.detailed-tooltip');
        const xy = d3.mouse(d3.select('.detailed-tooltip-container').node());
        tooltip
          .style('left', `${xy[0] + 10} px`)
          .style('top', `${xy[1] + 10} px`);
      })
      .on('mouseleave', () => {
        const tooltip = d3.select('.detailed-tooltip');
        tooltip.transition().style('opacity', 0);
        tooltip
          .style('left', `-1000px`)
          .style('top', `-1000px`);
      });

    eventSymbolsEnter.append('path')
      .attr('d', d3.symbol().type(d3.symbolTriangle))
      .attr('fill', (d) => {
        if (d.Glucose > 180) return this.colors[0];
        else if (d.Glucose > 70) return this.colors[1];
        else if (d.Glucose > 0) return this.colors[2];
        return this.colors[3];
      });

    eventSymbolsEnter.append('text')
      .text(d => d.Meal)
      .attr('y', -3)
      .attr('dy', '-0.71em')
      .attr('fill', 'grey');

    eventSymbolsEnter.merge(eventSymbols)
      .transition()
      .attr('transform', (d) => {
        if (Number.isNaN(d.Glucose)) {
          return `translate(${this.scaleX(secondInDay(d.time))}, ${this.paddingBottom + this.plotHeight})`;
        }
        return `translate(${this.scaleX(secondInDay(d.time))}, ${this.scaleY(d.Glucose)})`;
      });

    eventSymbols.exit().remove();
  }

  renderBasal() {
    const dateStr = dateToStr(this.date);
    if (this.basalData[dateStr] === undefined) {
      this.canvas.select('.basal-level').selectAll('rect').remove();
      return;
    }

    const basalDayData = this.basalData[dateStr].events;

    const basalLines = this.canvas.select('.basal-level')
      .selectAll('rect')
      .data(basalDayData);

    const basalLineEnter = basalLines.enter()
      .append('rect');

    basalLineEnter.merge(basalLines)
      .attr('x', d => this.scaleX(secondInDay(d.time)))
      .attr('y', d => this.basalScaleY(d.Rate))
      .attr('width', d => this.scaleX(d.duration / 1000) - this.paddingLeft)
      .attr('height', 1)
      .attr('fill', '#4286f4');

    basalLines.exit().remove();
  }

  renderBolus() {
    const dateStr = dateToStr(this.date);
    if (this.bolusData[dateStr] === undefined) {
      this.canvas.select('.bolus-level').selectAll('rect').remove();
      return;
    }

    const bolusDayData = this.bolusData[dateStr].events;

    console.log(bolusDayData);

    const bolusLines = this.canvas.select('.bolus-level')
      .selectAll('rect')
      .data(bolusDayData);

    const bolusLineEnter = bolusLines.enter()
      .append('rect');

    bolusLineEnter.merge(bolusLines)
      .attr('x', d => this.scaleX(secondInDay(d.time)) - 1)
      .attr('y', d => (this.paddingTop + this.plotHeight) - this.bolusScaleY(d.normal))
      .attr('width', 2)
      .attr('height', d => this.bolusScaleY(d.normal))
      .attr('fill', '#e22f47');

    bolusLines.exit().remove();
  }
}

class Alignment {
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

let alignment;
let vis;
let summaryVis;
let detailedVis;

const align = {
  first: '',
  second: '',
  type: 1,
};

/**
 * Set the possible time span for the date-selection inputs
 * @param {Object} start the start time
 * @param {Object} end the end time
 */
function setTimeSpan(start, end) {
  $('#start-date').attr({
    min: dateToStr(start),
    max: dateToStr(end),
  });

  $('#end-date').attr({
    min: dateToStr(start),
    max: dateToStr(end),
  });
}

function getStartDateFromDom() {
  const startDaySelector = $('#start-date');
  const start = moment(startDaySelector.val());
  return start;
}

function changeVisDate(startDay) {
  const endDay = moment(startDay);
  endDay.add(13, 'days');
  $('#start-date').val(dateToStr(startDay));
  $('#end-date').val(dateToStr(endDay));

  vis.setStartDate(startDay);
  vis.render();

  summaryVis.setStartDate(startDay);
  summaryVis.render();

  // detailedVis.render();
}

function oneDayBackward() {
  const start = getStartDateFromDom();
  start.subtract(1, 'days');
  changeVisDate(start);
}

function oneDayForward() {
  const start = getStartDateFromDom();
  start.add(1, 'days');
  changeVisDate(start);
}

function updateStartDate() {
  const start = getStartDateFromDom();
  changeVisDate(start);
}

function selectAlignment(i) {
  $('#alignment-selections').children()
    .removeClass('btn-outline-secondary')
    .addClass('btn-secondary');
  $(`#alignment-selections button:nth-child(${i})`)
    .removeClass('btn-secondary')
    .addClass('btn-outline-secondary');
  align.type = i;
}

function enableAlignmentSelection() {
  $('#alignment-selections').children().removeClass('disabled');
  selectAlignment(1);
}

function disableAlignmentSelection() {
  $('#alignment-selections').children()
    .addClass('disabled')
    .removeClass('btn-outline-secondary')
    .addClass('btn-secondary');
}

function loadDataAndRender() {
  d3.queue()
    .defer(d3.csv, 'glucose.csv')
    .defer(d3.csv, 'event.csv')
    .defer(d3.csv, 'basal.csv')
    .defer(d3.csv, 'bolus.csv')
    .await((error, glucoseData, eventData, basalData, bolusData) => {
      const { glucoseOrgData, firstData, lastData } = preprocessGlucoseData(glucoseData);
      const eventOrgData = preprocessEventData(eventData);
      const basalOrgData = preprocessBasalData(basalData);
      const bolusOrgData = preprocessBolusData(bolusData);

      setTimeSpan(firstData.time, lastData.time);

      const start = firstData.time;

      alignment = new Alignment();

      vis = new GlucoseVisualization(alignment);
      vis.setData(glucoseOrgData, eventOrgData);
      vis.resize();

      summaryVis = new SummaryVisualization();
      summaryVis.setData(eventOrgData, basalOrgData, bolusOrgData);
      summaryVis.setStartDate(start);
      summaryVis.resize();

      detailedVis = new DetailedVisualization(
        glucoseOrgData,
        eventOrgData,
        basalOrgData,
        bolusOrgData,
      );
      vis.setDetailedVis(detailedVis);
      detailedVis.resize();

      changeVisDate(start);
    });
}

function disableSecondAlignSelection() {
  disableAlignmentSelection();
  $('#2nd-align-dropdown').find('button')
    .html('2nd Align Event')
    .addClass('disabled');

  align.second = '';
  alignment.setAlign(align.first, align.second, align.type);
}

function enableSecondAlignSelection() {
  $('#2nd-align-dropdown').find('button').removeClass('disabled');
}


function firstAlignNone() {
  disableSecondAlignSelection();
  $('#1st-align-dropdown').find('button').html('1st Align Event');

  align.first = '';
  alignment.setAlign(align.first, align.second, align.type);
  vis.render();
}

function firstAlign(type) {
  enableSecondAlignSelection();
  $('#1st-align-dropdown').find('button').html(type);

  align.first = type;
  alignment.setAlign(align.first, align.second, align.type);
  vis.render();
}

function secondAlignNone() {
  disableAlignmentSelection();
  $('#2nd-align-dropdown').find('button').html('2nd Align Event');

  align.second = '';
  alignment.setAlign(align.first, align.second, align.type);
  vis.render();
}

function secondAlign(type) {
  enableAlignmentSelection();
  $('#2nd-align-dropdown').find('button').html(type);

  align.second = type;
  alignment.setAlign(align.first, align.second, align.type);
  vis.render();
}

function selectAlignmentAndRender(i) {
  selectAlignment(i);
  alignment.setAlign(align.first, align.second, align.type);
  vis.render();
}

$(document).ready(() => {
  $('#prev-day').click(oneDayBackward);
  $('#next-day').click(oneDayForward);
  $('#start-date').change(updateStartDate);

  $('#1st-align-none').click(firstAlignNone);
  $('#1st-align-breakfast').click(() => firstAlign('Breakfast'));
  $('#1st-align-lunch').click(() => firstAlign('Lunch'));
  $('#1st-align-dinner').click(() => firstAlign('Dinner'));

  $('#2nd-align-none').click(secondAlignNone);
  $('#2nd-align-breakfast').click(() => secondAlign('Breakfast'));
  $('#2nd-align-lunch').click(() => secondAlign('Lunch'));
  $('#2nd-align-dinner').click(() => secondAlign('Dinner'));

  $('#no-align').click(() => selectAlignmentAndRender(1));
  $('#left-align').click(() => selectAlignmentAndRender(2));
  $('#right-align').click(() => selectAlignmentAndRender(3));
  $('#justify-align').click(() => selectAlignmentAndRender(4));

  loadDataAndRender();

  $(window).resize(() => {
    vis.resize();
    detailedVis.resize();
    summaryVis.resize();
    // changeVisDate(getStartDateFromDom());
  });
});

}());
