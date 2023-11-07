import {Component, HostListener, Input, ViewChild} from '@angular/core';
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {EventService} from "../../../event.service";
import {ActivatedRoute, Router} from "@angular/router";
import {Availability, AvailabilityDto, AvailabilityHours} from "../../../shared/dtos/Availability";
import {HoursAddComponent} from "./hours-add/hours-add.component";
import {faPlus, faTrash} from '@fortawesome/free-solid-svg-icons';
import {EventDto} from "../../../shared/dtos/EventDto";
import {AvailabilityService} from "../../../availability.service";
import {firstValueFrom} from "rxjs";
import {AlertService} from "../../../common/alerts/service/alert.service";
import {EventUtils} from "../../../shared/utils/EventUtils";

@Component({
  selector: 'app-availability',
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.scss']
})
export class AvailabilityComponent {
  @ViewChild(HoursAddComponent) hoursAddComponent!: HoursAddComponent;
  public isEdit: boolean = false;
  public availabilityList: Availability[] = [];
  public event!: EventDto;
  public plus = faPlus;
  public trash = faTrash;
  private eventId: number = 0;

  constructor(private eventService: EventService,
              private availabilityService: AvailabilityService,
              private modalService: NgbModal,
              private router: Router,
              private route: ActivatedRoute,
              private alertService: AlertService) {
  }

  @HostListener('window:beforeunload', ['$event'])
  notification($event: any): void {
      $event.returnValue = 'Masz niezapisane zmiany. Czy na pewno chcesz opuścić tę stronę?';
  }

  async ngOnInit() {
    document.getElementById('focusReset')?.focus();

    this.event = this.eventService.getTemporaryEvent();
    this.isEdit = this.eventService.getIsEditConsideringRouter(this.router);
    this.eventId = EventUtils.getIdFromRoute(this.route);

    if (this.event == undefined && this.isEdit) {
      this.event = await firstValueFrom(this.eventService.getEvent(this.eventId));
    }

    let temporaryAvailabilities = this.availabilityService.getTemporaryAvailabilities();
    this.generateDates(new Date(this.event.researchStartDate), new Date(this.event.researchEndDate));

    if (!temporaryAvailabilities || temporaryAvailabilities.length == 0) {

      if (this.isEdit) {

        this.availabilityService.getAvailabilityList(this.eventId).subscribe((availabilityDtoList) => {
          this.includeAvailabilities(this.availabilityService.mapFromDto(availabilityDtoList))
        })
      }
    } else {

      this.includeAvailabilities(temporaryAvailabilities)
    }
  }

  includeAvailabilities(oldAvailabilities: Availability[]) {

    oldAvailabilities.forEach(oldAvailability => {
      let index = this.availabilityList.findIndex(newAvailability => newAvailability.date.toDateString() == oldAvailability.date.toDateString())
      if (index != -1) {
        Object.assign(this.availabilityList[index], oldAvailability)
      }
    })
  }

  goBack() {
    this.availabilityService.setTemporaryAvailabilities(this.availabilityList)
  }

  private generateDates(startDate: Date, endDate: Date) {
    let currentDate: Date = startDate;
    while (currentDate <= endDate) {
      let hoursList: AvailabilityHours[] = []
      this.availabilityList.push(
        new Availability(currentDate, hoursList))

      currentDate = this.addOneDay(currentDate)
    }
  }

  public submit() {

    if (this.isEdit) {

      this.eventService.modifyEvent(this.event).subscribe(
        response => {

          this.saveAvailability(response.id)
        }, error => {

          this.alertService.showError('Wystąpił błąd. Spróbuj ponownie.');
        }
      )

    } else {

      this.eventService.createEvent(this.event).subscribe(
        response => {

          this.saveAvailability(response.id);
        }, error => {

          this.alertService.showError('Wystąpił błąd. Spróbuj ponownie.');
        }
      )
    }
  }

  private saveAvailability(eventId: number) {

    let availabilityDtoList: AvailabilityDto[] = this.availabilityService.convertAvailabilityToDto(this.availabilityList)

    if (this.isEdit) {

      this.availabilityService.patchAvailabilityList(availabilityDtoList, eventId).subscribe(
        response => {

          this.eventService.clearTemporaryEvent();
          this.availabilityService.clearTemporaryAvailabilities();
          this.router.navigate(['/appointments']);
        }, error => {

          this.alertService.showError('Wystąpił błąd. Spróbuj ponownie.');
        })
    } else {

      this.availabilityService.saveAvailabilityList(availabilityDtoList, eventId).subscribe(
        response => {

          this.eventService.clearTemporaryEvent();
          this.availabilityService.clearTemporaryAvailabilities();
          this.alertService.showSuccess('Pomyślnie dodano wydarzenie');
          this.router.navigate(['/appointments']);
        }, error => {

          this.alertService.showError('Wystąpił błąd. Spróbuj ponownie.');
        }
      )
    }
  }

  private addOneDay(currentDate: Date) {
    let date = new Date(currentDate)
    date.setDate(date.getDate() + 1)
    return date
  }

  public removeHour (availability: Availability, hours: any): void {
    availability.hoursList.forEach((itemList, index) => {
      if (itemList === hours) {
        availability.hoursList.splice(index, 1)
      }
    })
  }
}
