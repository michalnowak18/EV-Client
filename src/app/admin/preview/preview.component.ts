import {Component, HostListener, ViewChild} from '@angular/core';
import {User} from "../../shared/dtos/User";
import {faArrowUpRightFromSquare, faEdit} from "@fortawesome/free-solid-svg-icons";
import {AssignModalComponent} from "./assign-modal/assign-modal.component";
import {AlertService} from "../../common/alerts/service/alert.service";
import {ResetPasswordModalComponent} from "./reset-password-modal/reset-password-modal.component";
import {BlockUserModalComponent} from "./block-user-modal/block-user-modal.component";
import { Role } from 'src/app/shared/enums/role';
import {ActivatedRoute} from "@angular/router";
import {AdminService} from "../../shared/services/admin.service";
import {EventService} from "../../event.service";
import {EventDto} from "../../shared/dtos/EventDto";

@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss']
})
export class PreviewComponent {

  public userId: number = 0;
  public user: User;
  public events: EventDto[] = [];
  public edit = faEdit;
  public open = faArrowUpRightFromSquare;
  public showMore: boolean = false;
  @ViewChild(AssignModalComponent) assignModalComponent!: AssignModalComponent;
  @ViewChild(ResetPasswordModalComponent) resetPasswordModalComponent!: ResetPasswordModalComponent;
  @ViewChild(BlockUserModalComponent) blockUserModalComponent!: BlockUserModalComponent;
  @HostListener('document:click', ['$event'])

  private handleClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.btn-outline-primary') && !target.closest('#showMore')) {
      this.showMore = false;
    }
  }

  constructor(
    private alertService: AlertService,
    private route: ActivatedRoute,
    private adminService: AdminService,
    private eventService: EventService
  ) {
    this.user = new User('sample@gmail.com', 'sample', Role.RECRUITER)
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.userId = params['id'];
    });

    this.adminService.getUser(this.userId).subscribe(user => {
      this.user = user;

      this.eventService.getEvents().subscribe(events => {

        this.events = events;
      })
    })
  }

  public toggleShowMore(event: any) {
    this.showMore = !this.showMore;
    event.target.setAttribute('aria-expanded', this.showMore.toString());
  }
}