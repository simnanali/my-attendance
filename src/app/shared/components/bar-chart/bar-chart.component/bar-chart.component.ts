import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 160;
const LABEL_AREA_HEIGHT = 28;
const MAX_BAR_WIDTH = 48;
const BAR_WIDTH_RATIO = 0.6;

/**
 * Reusable, dependency-free bar chart. Renders raw SVG using the
 * app's existing CSS variable tokens (var(--color-primary), etc.), so
 * dark mode is inherited automatically with zero extra theming code.
 *
 * highlightIndex (optional): renders that one bar with a distinct
 * diagonal-stripe pattern instead of the flat fill, e.g. to mark
 * "today" on Monthly Report as still live/accruing — matching the
 * same striped visual language used on Dashboard's progress bar.
 * Defaults to undefined, so existing callers (Dashboard) that don't
 * pass it are completely unaffected.
 */
@Component({
  imports: [CommonModule],
  selector: 'app-bar-chart',
  styleUrl: './bar-chart.component.scss',
  templateUrl: './bar-chart.component.html',
})
export class BarChartComponent {
  @Input() labels: string[] = [];
  @Input() values: number[] = [];
  @Input() valueSuffix = 'h';
  @Input() valueDecimals = 1;
  @Input() highlightIndex?: number;

  readonly chartWidth = CHART_WIDTH;
  readonly chartHeight = CHART_HEIGHT;
  readonly totalHeight = CHART_HEIGHT + LABEL_AREA_HEIGHT;

  get maxValue(): number {
    return Math.max(...this.values, 1);
  }

  private get slotWidth(): number {
    return this.chartWidth / Math.max(this.labels.length, 1);
  }

  get barWidth(): number {
    return Math.min(this.slotWidth * BAR_WIDTH_RATIO, MAX_BAR_WIDTH);
  }

  barX(index: number): number {
    return index * this.slotWidth + (this.slotWidth - this.barWidth) / 2;
  }

  barHeight(value: number): number {
    return Math.max((value / this.maxValue) * this.chartHeight, 2);
  }

  barY(value: number): number {
    return this.chartHeight - this.barHeight(value);
  }

  labelX(index: number): number {
    return index * this.slotWidth + this.slotWidth / 2;
  }

  formattedValue(value: number): string {
    return `${value.toFixed(this.valueDecimals)}${this.valueSuffix}`;
  }

  isHighlighted(index: number): boolean {
    return index === this.highlightIndex;
  }
}
