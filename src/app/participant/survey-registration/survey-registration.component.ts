import {Component} from '@angular/core';
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {EventDto} from "../../shared/dtos/EventDto";
import {EventService} from "../../event.service";
import {ActivatedRoute, Router} from "@angular/router";
import {Availability} from "../../shared/dtos/Availability";
import {AvailabilityService} from "../../availability.service";
import {SurveyService} from "../../survey.service";
import {SurveyDto} from "../../shared/dtos/SurveyDto";
import {ConfirmationDto} from "../../shared/dtos/ConfirmationDto";
import {TitleService} from "../../shared/services/title.service";
import {SurveyState} from "../../shared/enums/survey-state";
import {AlertService} from "../../common/alerts/service/alert.service";
import {FormatDate} from "../../shared/utils/format-date";
import {ConsentService} from "../../shared/services/consent.service";
import {ConsentDto} from "../../shared/dtos/ConsentDto";
import {PreloaderService} from "../../shared/services/preloader.service";

@Component({
  selector: 'app-survey-registration',
  templateUrl: './survey-registration.component.html',
  styleUrls: ['./survey-registration.component.scss']
})

export class SurveyRegistrationComponent {
  private survey!: SurveyDto;
  private event!: EventDto;
  public availabilityList: Availability[] = [];
  public consentList: ConsentDto[] = [];
  private surveyCode!: string;
  public form!: FormGroup;
  public selectedDay: string = '';
  public selectedHour: string = '';
  public filteredHoursList: any[] = [];
  private updatedAvailabilityList: any[] = [];
  private endHours: any[] = [];
  private today: Date = new Date;
  public formEventName: string = "";
  public formSurveyDuration: number = 0;
  public formEventEndDate: string = "";
  public formatDate = FormatDate;

  constructor(private eventService: EventService,
              private availabilityService: AvailabilityService,
              private surveyService: SurveyService,
              private route: ActivatedRoute,
              private router: Router,
              private alertService: AlertService,
              private titleService: TitleService,
              private consentService: ConsentService,
              private preloader: PreloaderService) {

    this.route.params.subscribe(params => {
      this.surveyCode = params['code'];
    });
  }

  ngOnInit(): void {
    this.fetchSurvey();
    document.getElementById('focusReset')?.focus();
    this.titleService.setTitle('Rejestracja na badanie');
    this.initFormGroup();
  }

  private initFormGroup() {
    this.form = new FormGroup({
      dayChoice: new FormControl(null, [Validators.required]),
      hourChoice: new FormControl(null, [Validators.required])
    });
  }

  private fetchSurvey() {
    this.preloader.show();
    this.surveyService.getSurvey(this.surveyCode).subscribe((surveyDto) => {
      this.survey = surveyDto;
      this.fetchEvent(this.survey.eventId, true);
      this.fetchConsents();
    }, (error) => {
      this.preloader.hide();
      this.router.navigate(['/404'])
    })
  }

  private fetchConsents() {
    this.consentService.getConsentsForEvent(this.survey.eventId).subscribe(consents => {
      this.preloader.hide();
      this.consentList = consents;
      this.consentList.forEach(consent => {
        if (consent.mandatory) {
          this.form.addControl((consent.id).toString(), new FormControl(false, Validators.requiredTrue))
        } else {
          this.form.addControl((consent.id).toString(), new FormControl(false))
        }
      })
    })
  }

  private fetchEvent(eventId: number, shouldNavigate: boolean): void {
    this.eventService.getEvent(eventId).subscribe((event) => {
      this.event = event;
      this.formEventName = event.name
      this.formSurveyDuration = event.surveyDuration
      this.formEventEndDate = event.endDate
      let eventDate: Date = new Date(event.endDate);

      this.today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);

      if (shouldNavigate && this.survey.surveyState !== SurveyState.UNUSED
        || this.event.slotsTaken === this.event.maxUsers || this.today > eventDate) {
        this.router.navigate(['register/' + this.surveyCode + '/invalid-code'])
      }

      this.fetchAvailabilityList();
    });
  }

  private fetchAvailabilityList(): void {
    this.availabilityService.getAvailabilityList(this.event.id).subscribe((availabilityDtoList) => {
      this.availabilityList = this.availabilityService.mapFromDto(availabilityDtoList);
      this.sortAvailabilityList();
    });
  }

  private sortAvailabilityList() {
    this.availabilityList.sort((a, b) => {
      const dateA = new Date(a.date).setHours(0, 0, 0, 0);
      const dateB = new Date(b.date).setHours(0, 0, 0, 0);
      return dateA - dateB;
    });
  }

  save() {
    if (this.validate()) {
      this.preloader.show();
      let date: Date = new Date(this.selectedDay);
      let consentsChecked: number[] = [];
      const [hours, minutes] = this.selectedHour.split(':').map(Number);

      this.consentList.forEach(consent => {
        if (this.consentFromId(consent.id).value === true) {
          consentsChecked.push(consent.id);
        }
      });

      date.setHours(hours, minutes);
      this.survey.date = date;
      this.survey.surveyState = SurveyState.USED;

      this.surveyService.modifySurvey(this.survey).subscribe((survey) => {

        this.consentService.saveConsentsForSurvey(consentsChecked, survey.id).subscribe( consentDtos => {

          this.surveyService.setTemporaryConfirmation(new ConfirmationDto(this.event.name, date));
          this.preloader.hide();
          this.router.navigate(['register/' + this.surveyCode + '/confirmation']);
        })

      }, (exception) => {

        if (exception.status === 409) {
          this.preloader.hide();
          this.handleHttp409();
        }
        this.preloader.hide();
      })
    } else {
      this.alertService.showError('Uzupełnij wymagane pola.');
    }
  }

  private handleHttp409() {
    this.alertService.showError('Wybrany termin już jest zajęty, wybierz inny.');
    this.fetchEvent(this.survey.eventId, false);
    this.form.get('dayChoice')?.setValue('');
    this.form.get('dayChoice')?.updateValueAndValidity();
    this.form.get('hourChoice')?.setValue('');
    this.form.get('hourChoice')?.updateValueAndValidity();
  }

  private validate(): boolean {
    let noErrors: boolean = true;

    Object.keys(this.form.controls).forEach(key => {
      if (this.form.get(key)?.invalid) {
        this.form.get(key)?.markAsTouched();
        this.form.get(key)?.markAsDirty();
        this.form.get(key)?.updateValueAndValidity();
        noErrors = false;
      }
    })

    return noErrors;
  }

  filterHoursList(): void {
    const selectedDayIndex = this.availabilityList.findIndex(availability =>
      availability.date.toDateString() === this.selectedDay
    );

    this.filteredHoursList = [];
    this.updatedAvailabilityList = [];

    if (selectedDayIndex !== -1) {
      this.availabilityList[selectedDayIndex].hoursList.forEach((hourItem) => {
        const {startHour, endHour} = hourItem;

        this.endHours.push(endHour)

        const [startHourValue, startMinuteValue] = startHour.split(':').map(part => parseInt(part, 10));
        const [endHourValue, endMinuteValue] = endHour.split(':').map(part => parseInt(part, 10));

        const totalLength = this.event.surveyDuration + this.event.surveyBreakTime;
        const totalLengthDate = new Date();
        totalLengthDate.setHours(Math.floor(totalLength / 60), totalLength % 60);

        const startDate = new Date();
        startDate.setHours(startHourValue, startMinuteValue);
        const endDate = new Date();
        endDate.setHours(endHourValue, endMinuteValue);

        const updatedStartDate = new Date();
        updatedStartDate.setHours(startHourValue, startMinuteValue);
        const updatedEndDate = new Date();
        const totalChoiceMinutes = endMinuteValue + endHourValue * 60;
        const minutesDif = totalChoiceMinutes - totalLength;
        updatedEndDate.setHours(Math.floor(minutesDif / 60), minutesDif % 60);

        while (updatedStartDate <= updatedEndDate) {
          const currentHour = updatedStartDate.getHours();
          const currentMinute = updatedStartDate.getMinutes();
          const formattedHour = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

          this.filteredHoursList.push(formattedHour);
          updatedStartDate.setMinutes(updatedStartDate.getMinutes() + 30);
        }

        while (startDate <= endDate) {
          const currentHour = startDate.getHours();
          const currentMinute = startDate.getMinutes();
          const formattedHour = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

          this.updatedAvailabilityList.push(formattedHour);
          startDate.setMinutes(startDate.getMinutes() + 30);
        }
      });
    }
  }

  get dayChoice() {
    return this.form.get('dayChoice')!;
  }

  get hourChoice() {
    return this.form.get('hourChoice')!;
  }

  get consents() {
    return this.form.get('consents')!;
  }

  consentFromId(consentId: number) {
    return this.form.get(consentId.toString())!;
  }
}
