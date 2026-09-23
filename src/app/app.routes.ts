import { Routes } from '@angular/router';
import { RegisterComponent } from '../app/features/auth/register/register.component/register.component';
import { LoginComponent } from '../app/features/auth/login/login.component/login.component';
import { ProfileComponent } from '../app/features/profile/profile.component/profile.component';
import { DashboardComponent } from '../app/features/dashboard/dashboard.component/dashboard.component';
import { AttendanceComponent } from '../app/features/attendance/attendance.component/attendance.component';
import { DailyReportComponent } from '../app/features/daily-report/daily-report.component/daily-report.component';
import { MonthlyReportComponent } from '../app/features/monthly-report/monthly-report.component/monthly-report.component';
import { AppLayoutComponent } from '../app/layout/app-layout/app-layout.component/app-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { HolidaysComponent } from './features/holidays/holidays.component/holidays.component';
import { WeekoffComponent } from './features/weekoff/weekoff.component/weekoff.component';
import { AttendanceRulesComponent } from './features/attendance-rules/attendance-rules.component/attendance-rules.component';

/*
 * Authenticated routes are nested under AppLayoutComponent with a
 * SINGLE authGuard on the parent — protecting all children at once
 * rather than repeating canActivate on every route (Section 23,
 * Phase Layout). Login/Register remain top-level, outside the
 * authenticated shell. Holiday/Weekoff/Attendance Rules (Phase 8B)
 * are added as children here, inheriting that same guard.
*/

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard' } },
      { path: 'attendance', component: AttendanceComponent, data: { title: 'Attendance' } },
      { path: 'daily-report', component: DailyReportComponent, data: { title: 'Daily Report' } },
      { path: 'monthly-report', component: MonthlyReportComponent, data: { title: 'Monthly Report' } },
      { path: 'profile', component: ProfileComponent, data: { title: 'Profile' } },
      { path: 'holidays', component: HolidaysComponent, data: { title: 'Holidays' } },
      { path: 'weekoff', component: WeekoffComponent, data: { title: 'Weekoff' } },
      { path: 'attendance-rules', component: AttendanceRulesComponent, data: { title: 'Attendance Rules' } },

    ],
  },
  { path: '**', redirectTo: 'login' },
];