import {Component, ViewChild} from '@angular/core';
import {EventDto} from "../../../shared/dtos/EventDto";
import {ActivatedRoute, Router} from '@angular/router';
import {Availability} from "../../../shared/dtos/Availability";
import {EventService} from "../../../event.service";
import {AvailabilityService} from "../../../availability.service";
import {EventUtils} from "../../../shared/utils/EventUtils";
import {SurveyService} from "../../../survey.service";
import {SurveyDto} from "../../../shared/dtos/SurveyDto";
import {faListCheck, faTrash} from '@fortawesome/free-solid-svg-icons';
import {ClipboardService} from 'ngx-clipboard';
import {DeleteCodeComponent} from "./delete-code/delete-code.component";
import {DeleteEventComponent} from "./delete-event/delete-event.component";
import {environment} from "../../../../environments/environment";
import {TitleService} from "../../../shared/services/title.service";
import {AlertService} from "../../../common/alerts/service/alert.service";
import {FormatDate} from "../../../shared/utils/format-date";
import {AuthService} from "../../../shared/services/auth.service";
import {ViewConsentModalComponent} from "./view-consent-modal/view-consent-modal.component";
import {PreloaderService} from "../../../shared/services/preloader.service";
import {HttpResponse} from "@angular/common/http";
import {ConsentService} from "../../../shared/services/consent.service";

@Component({
  selector: 'app-event',
  templateUrl: './event.component.html',
  styleUrls: ['./event.component.scss']
})
export class EventComponent {
  @ViewChild(DeleteCodeComponent) deleteCodeComponent!: DeleteCodeComponent;
  @ViewChild(DeleteEventComponent) deleteEventComponent!: DeleteEventComponent;
  @ViewChild(ViewConsentModalComponent) viewConsentModalComponent!: ViewConsentModalComponent;
  public availabilityList: Availability[] = [];
  public surveyList: SurveyDto[] = []
  public event: EventDto;
  public eventId: number = -1;
  public surveyDurationHHMM = "00:00";
  public trash = faTrash;
  public listCheck = faListCheck;
  public formatDate = FormatDate;
  private token: string | null = null;
  private role: string | null = 'null';
  public canModify: boolean = false;
  public showMore: boolean = false;

  constructor(private eventService: EventService,
              private availabilityService: AvailabilityService,
              private surveyService: SurveyService,
              public router: Router,
              private route: ActivatedRoute,
              private clipboardService: ClipboardService,
              private alertService: AlertService,
              private titleService: TitleService,
              private authService: AuthService,
              private preloader: PreloaderService,
              private consentService: ConsentService,) {
    this.token = this.authService.token;
    this.event = {} as EventDto
  }

  ngOnInit() {
    if (this.authService.isTokenExpired(this.token)) {
      this.authService.removeToken();
      this.authService.saveURL(this.router);
      this.router.navigate(['/login']);
    } else {
      this.preloader.show();
      document.getElementById('focusReset')?.focus();
      this.route.params.subscribe(params => {
        this.eventId = params['id'];
      });

      this.role = atob(this.authService.getRole()!)


      this.eventService.getEvent(this.eventId).subscribe((eventDto) => {
        this.event = eventDto;

        if (this.role === 'ADMIN' || this.event.userId === Number(this.authService.getUserId())) {
          this.canModify = true;
        }

        this.titleService.setTitle('Szczegóły wydarzenia ' + this.event.name);
        this.surveyDurationHHMM = EventUtils.convertMinutesToHHMM(this.event.surveyDuration)

        this.availabilityService.getAvailabilityList(this.eventId).subscribe((availabilityDtoList) => {
          this.availabilityList = this.availabilityService.mapFromDto(availabilityDtoList);
          this.sortAvailabilityList();
          this.sortAvailabilityHours();
        });

        this.surveyService.getSurveys(this.event.id).subscribe((surveys) => {
          this.preloader.hide();
          this.surveyList = surveys.sort((a, b) => {
            const stateOrder = ['USED', 'UNUSED', 'INACTIVE'];
            return stateOrder.indexOf(a.surveyState) - stateOrder.indexOf(b.surveyState);
          });
        })
      }, (error) => {
        this.preloader.hide();
        if (error.status === 403) {
          this.router.navigate(['/403'], {skipLocationChange: true})
        } else {
          this.router.navigate(['/404'], {skipLocationChange: true})
        }
      })
    }
  }

  private sortAvailabilityList() {
    this.availabilityList.sort((a, b) => {
      const dateA = new Date(a.date).setHours(0, 0, 0, 0);
      const dateB = new Date(b.date).setHours(0, 0, 0, 0);
      return dateA - dateB;
    });
  }

  private sortAvailabilityHours() {
    this.availabilityList.forEach((availability) => {
      availability.hoursList.sort();
    });
  }

  public downloadConsents(id: number | null) {
    if (id !== null) {
      this.consentService.getSurveysAndConsentsCsv(id).subscribe(response => {
        this.downloadCsv(response)
      });

    } else {
      this.alertService.showError('Błąd pobierania zgód.')
    }
  }

  private downloadCsv(response: HttpResponse<string>) {
    if (response.body) {
      const blob = new Blob([response.body], {type: 'text/csv'});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = <string>response.headers.get('Content-Disposition')?.substring(21);
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }

  public copyToClipboard(code: string) {
    this.clipboardService.copyFromContent(environment.selfUrl + '/register/' + code);
    this.alertService.showInfo('Skopiowano kod spotkania: ' + code)
  }

  public goToEdit() {
    this.eventService.setIsEdit(true)
  }

  public getDateFormatted(survey: SurveyDto): string {
    return survey.date!.toLocaleDateString('pl-PL', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: "2-digit", minute: "2-digit"
    });
  }
}
