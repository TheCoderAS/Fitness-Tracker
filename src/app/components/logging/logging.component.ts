import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { MatRippleModule } from '@angular/material/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { FormFields } from '../../framework/form/form.interfaces';
import { loggingViewFormFieldsInitial, loggingAddFormFieldsInitial } from './logging.resources';
import { FormComponent } from "../../framework/form/form.component";
import { ApiService, delay } from '../../services/api.service';
import { FabButtonComponent } from "../../framework/fab-button/fab-button.component";
import { RightPanelComponent } from "../../framework/right-panel/right-panel.component";
import nls from '../../framework/resources/nls/logging';
import { ModalWindowComponent } from "../../framework/modal-window/modal-window.component";
import moment from 'moment';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { MessagesService } from '../../services/messages.service';

@Component({
  selector: 'app-logging',
  standalone: true,
  imports: [CommonModule, MatRippleModule, FormComponent, FabButtonComponent, RightPanelComponent, ModalWindowComponent, MatDividerModule, MatButtonModule],
  templateUrl: './logging.component.html',
  styleUrl: './logging.component.scss'
})
export class LoggingComponent implements OnInit {
  private _api: ApiService = inject(ApiService);
  private _message: MessagesService = inject(MessagesService);

  widgetId: string = '';
  widgetData = new BehaviorSubject<any>(null);
  loggingViewFormFields = new BehaviorSubject<FormFields[]>([]);
  loggingAddFormFields = new BehaviorSubject<any>({});
  scheduleList = new BehaviorSubject<any[]>([]);
  selectedScheduleData = new BehaviorSubject<any>(null);
  rightPanelOpen: WritableSignal<boolean> = signal(false);
  isEdit = new BehaviorSubject<boolean>(false);
  loggingViewFormData = new BehaviorSubject<any>(null);
  isModalOpen: WritableSignal<boolean> = signal(false);
  modalInfo: WritableSignal<string[]> = signal(['', '', '']);
  weekly = new BehaviorSubject<boolean>(false);
  scheduledTasks = new BehaviorSubject<any[]>([]);
  selectedTask = new BehaviorSubject<any>(null);
  nls = nls;
  moment = moment
  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.widgetId = params['log_type'];
      this.setWidgetData();
      this.setScheduleSelectFormFields((new Date()).toISOString());
    });
  }
  async setWidgetData() {
    let widgets = await this._api.local_get('widgets');
    let filteredWidget = widgets.find((widget: any) => widget.id === this.widgetId);
    this.weekly.next(filteredWidget && filteredWidget.type === 'WEEKLY')
    this.widgetData.next(filteredWidget);
  }
  async setScheduleSelectFormFields(day: any) {
    this.loggingViewFormFields.next([])
    let today = (new Date()).toISOString();
    await delay(20);
    let options = await this.buildScheduleOptions(day);
    let fields: FormFields[] = [...loggingViewFormFieldsInitial];
    let defaultSchedule = options[0]?.value;

    fields.map((field: FormFields) => {
      if (this.loggingViewFormData.getValue()) {
        if (field.name === 'loggingDate') {
          field.defaultValue = this.loggingViewFormData.getValue().loggingDate;
          field.max = today
        }
      } else {
        if (field.name === 'loggingDate') {
          field.defaultValue = today;
          field.max = today
        }
      }
      if (field.name === 'scheduleId') {
        field.options = options;
        field.defaultValue = defaultSchedule;
      }

      return field;
    });
    this.loggingViewFormFields.next(fields)
  }
  async buildScheduleOptions(today: any) {
    let schedules = await this._api.local_get('schedules');
    let filteredSchedule;
    if (this.weekly.getValue()) {
      filteredSchedule = schedules.filter((schedule: any) => schedule.widgetId === this.widgetId && schedule.startDay == moment(today).day());
    } else {
      filteredSchedule = schedules.filter((schedule: any) => schedule.widgetId === this.widgetId);
    }

    let options: { label: any; value: any; }[] = [];
    filteredSchedule.forEach((schedule: any) => {
      let option = { label: schedule.scheduleName, value: schedule.id };
      options.push(option);
    });
    this.scheduleList.next(filteredSchedule);
    return options;
  }
  async handleLoggingViewFormChange(data: any) {
    let selectedSchedule = this.scheduleList.getValue().find((schedule) => schedule.id === data.scheduleId);
    this.selectedScheduleData.next(selectedSchedule);
    this.scheduledTasks.next(await this.getScheduledTasks());
    if (moment(this.loggingViewFormData.getValue()?.loggingDate).format('L') !== moment(data.loggingDate).format('L')) {
      this.setScheduleSelectFormFields(data.loggingDate);
    }
    this.loggingViewFormData.next(data);
    // console.log(this.selectedScheduleData.getValue())
  }
  toggleModal(state: boolean) {
    this.isModalOpen.set(state);
  }
  async submitModal(data: any) {
    this.togglePanel(false);
    this.toggleModal(false);
    this.modalInfo.set(['', '', '', '']);
    this.isEdit.next(false);
    this.selectedTask.next(null);

  }
  async getScheduledTasks() {
    let tasks = await this._api.local_get('tasks');
    let filteredTasks = tasks.filter((task: any) => {
      return task.widgetId === this.widgetId && this.selectedScheduleData.getValue()?.tasks?.includes(task.id)
    });
    // console.log(filteredTasks);

    return filteredTasks;
  }
  async createLogging(task: any) {
    this.togglePanel(true);
    let scheduleOptions = await this.buildScheduleOptions(this.loggingViewFormData.getValue().loggingDate);

    //get existing log
    let existingLog = await this._api.local_get_by_id('logging', {
      scheduleId: this.loggingViewFormData.getValue().scheduleId,
      widgetId: this.widgetData.getValue().id,
      taskId: task.id
    });
    existingLog = existingLog?.find((log: any) => {
      return moment(log.loggingDate).format('L') === moment(this.loggingViewFormData.getValue().loggingDate).format('L')
    });
    console.log('Existing Log: ', existingLog);

    //basic fields
    let basicFields = [...loggingAddFormFieldsInitial];

    basicFields.map((field: FormFields) => {
      if (field.name === "scheduleId") {
        field.defaultValue = this.loggingViewFormData.getValue().scheduleId;
        field.options = scheduleOptions
      }
      if (field.name === 'loggingDate') {
        field.defaultValue = this.loggingViewFormData.getValue().loggingDate
      }
      return field;
    });

    let fields = { basic: { fields: basicFields } };

    task.items.forEach((taskItem: any, index: number) => {
      let taskFields = taskItem.formFields;
      console.log('Task Item: ', taskItem);
      console.log('Task Logs: ', existingLog?.logs[taskItem.id]);

      taskFields = taskFields.filter((field: any) => field.name !== 'itemName')
      taskFields.map((taskField: FormFields) => {
        console.log("Task Achievement: ", existingLog?.logs[taskItem.id]?.achieved[taskField.name])
        taskField.deletable = false;
        taskField.defaultValue = existingLog && existingLog.logs[taskItem.id] ? existingLog.logs[taskItem.id].achieved[taskField.name] : '';
        return taskField;
      });
      fields = { ...fields, [`item${index}`]: { fields: taskFields, id: taskItem.id, oldvalue: taskItem.formData } };
    });
    console.log(fields);
    this.selectedTask.next(task);
    this.loggingAddFormFields.next(fields);
  }
  async togglePanel(state: boolean) {
    this.rightPanelOpen.set(state);
  }
  closePanel(data: any): void {
    this.isModalOpen.set(true);
    if (this.isEdit.getValue()) {
      this.modalInfo.set(['add-edit', nls.editLog, 'confirm']);

    } else {
      this.modalInfo.set(['add-edit', nls.addLog, 'confirm']);
    }
  }
  async handleAddLoggingFormSubmit(data: any, taskItem: any, basic: any) {
    data.itemName = taskItem.oldvalue.itemName
    let logData;
    let result;
    let loggingDate = basic.fields.find((it: any) => it.name === 'loggingDate')?.defaultValue;

    let existingLog = await this._api.local_get_by_id('logging', {
      scheduleId: this.selectedScheduleData.getValue().id,
      widgetId: this.widgetData.getValue().id,
      taskId: this.selectedTask.getValue().id
    });
    existingLog = existingLog?.find((log: any) => {
      return moment(log.loggingDate).format('L') === moment(loggingDate).format('L')
    });
    // console.log(existingLog)
    if (existingLog) {
      existingLog.logs[taskItem.id] = {
        fields: taskItem.fields,
        target: taskItem.oldvalue,
        achieved: data
      }
      result = await this._api.local_put('logging', existingLog);
    } else {
      logData = {
        widget: this.widgetData.getValue(),
        schedule: this.selectedScheduleData.getValue(),
        logs: {
          [taskItem.id]: {
            fields: taskItem.fields,
            target: taskItem.oldvalue,
            achieved: data
          }
        },
        taskId: this.selectedTask.getValue()?.id,
        scheduleId: this.selectedScheduleData.getValue().id,
        widgetId: this.widgetData.getValue().id,
        loggingDate: loggingDate
      };
      result = await this._api.local_post('logging', logData);
    }
    if (result.success) {
      this._message.success(result.message);
    } else {
      this._message.error(result.message)
    }
  }
  getFlatFieldItems(): any[] {
    return Object.keys(this.loggingAddFormFields.getValue());
  }
}
