#!/bin/bash

rollup app.js --output.format iife --output.file t1d.js
rollup dayByMeal.js --output.format iife --output.file tbm.js
