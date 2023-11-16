import {Component, ViewChild} from '@angular/core';
import {EventDto} from "../../../shared/dtos/EventDto";
import {ActivatedRoute, Router} from '@angular/router';
import {Availability} from "../../../shared/dtos/Availability";
import {EventService} from "../../../event.service";
import {AvailabilityService} from "../../../availability.service";
import {EventUtils} from "../../../shared/utils/EventUtils";
import {SurveyService} from "../../../survey.service";
import {SurveyDto} from "../../../shared/dtos/SurveyDto";
import {faTrash} from '@fortawesome/free-solid-svg-icons';
import {ClipboardService} from 'ngx-clipboard';
import {DeleteCodeComponent} from "./delete-code/delete-code.component";
import {DeleteEventComponent} from "./delete-event/delete-event.component";
import {environment} from "../../../../environments/environment";
import {TitleService} from "../../../shared/services/title.service";
import {AlertService} from "../../../common/alerts/service/alert.service";
import {FormatDate} from "../../../shared/utils/format-date";
import {AuthService} from "../../../shared/services/auth.service";

@Component({
  selector: 'app-event',
  templateUrl: './event.component.html',
  styleUrls: ['./event.component.scss']
})
export class EventComponent {
  @ViewChild(DeleteCodeComponent) deleteCodeComponent!: DeleteCodeComponent;
  @ViewChild(DeleteEventComponent) deleteEventComponent!: DeleteEventComponent;
  public availabilityList: Availability[] = [];
  public surveyList: SurveyDto[] = []
  public event: EventDto;
  private eventId: number = -1;
  public surveyDurationHHMM = "00:00";
  public trash = faTrash;
  public formatDate = FormatDate;

  constructor(private eventService: EventService,
              private availabilityService: AvailabilityService,
              private surveyService: SurveyService,
              public router: Router,
              private route: ActivatedRoute,
              private clipboardService: ClipboardService,
              private alertService: AlertService,
              private titleService: TitleService,
              private authService: AuthService) {

    this.event = {} as EventDto
  }

  ngOnInit() {
    this.authService.saveURL(this.router);
    document.getElementById('focusReset')?.focus();
    this.route.params.subscribe(params => {
      this.eventId = params['id'];
    });

    this.eventService.getEvent(this.eventId).subscribe((eventDto) => {
      this.event = eventDto;
      this.titleService.setTitle('Szczegóły wydarzenia ' + this.event.name);
      this.surveyDurationHHMM = EventUtils.convertMinutesToHHMM(this.event.surveyDuration)

      this.availabilityService.getAvailabilityList(this.eventId).subscribe((availabilityDtoList) => {
        this.availabilityList = this.availabilityService.mapFromDto(availabilityDtoList);
      });

      this.surveyService.getSurveys(this.event.id).subscribe((surveys) => {
        this.surveyList = surveys;
      })
    }, (error) => {
      if (error.status === 403) {
        this.router.navigate(['/403'])
      } else {
        this.router.navigate(['/404'])
      }
    })
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
