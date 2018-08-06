import {
  dateToStr,
  secondInDay,
  totalSecOfDay,
} from './date';

export default class DetailedVisualization {
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
        tooltip.transition().style('opacity', 1)
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
        tooltip.transition().style('opacity', 0)
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
          .html(`<b>${d.Meal}</b>: ${Number.isNaN(d.MealCarbs) ? "Not Available" : d.MealCarbs} carbs</br>`)
        tooltip.selectAll('.value-2')
          .html(`<b>Glucose:</b> ${d.Glucose}</br>`)
        tooltip.selectAll('.value-3')
          .html(`<b>Food:</b> ${d.WhatEating}</br>`)
        tooltip.selectAll('.value-4')
          .html(`<b>Humalog:</b> ${Number.isNaN(d.Humalog) ? "Not Available" : d.Humalog}</br>`)
        tooltip.selectAll('.value-5')
          .html(`<b>Caregiver:</b> ${d.Caregiver}</br>`)
        tooltip.selectAll('.value-5')
          .html(`<b>Notes:</b> ${d.Notes}</br>`)
        tooltip.selectAll('.value-7')
          .html(`<b>Time:</b> ${d.time.format('LLL')}</br>`);
        tooltip.transition().style('opacity', 1)
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
        tooltip.transition().style('opacity', 0)
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

export {
  DetailedVisualization,
};
