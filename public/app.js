import {
  GlucoseVisualization,
} from './glucose_visualization';
import {
  SummaryVisualization,
} from './summary_visualization';
import {
  DetailedVisualization,
} from './detailed_visualization';
import {
  Alignment,
} from './alignment';
import {
  dateToStr,
} from './date';
import {
  preprocessBasalData,
  preprocessBolusData,
  preprocessEventData,
  preprocessGlucoseData,
} from './data';

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
