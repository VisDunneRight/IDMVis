import {
  getDataInDays,
} from './data';

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

export default class SummaryVisualization {
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

export {
  SummaryVisualization,
};
