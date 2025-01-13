import { Input, Component } from '@angular/core';

@Component({
    selector: 'outbox',
    standalone: true,
    templateUrl: './outbox.html',
    styleUrls: ['./outbox.less']
})
export class OutboxComponent {
    @Input() text: string = '';

    clear() {
        this.text = '';
    }

    append(str: string) {
        this.text += str + '\n';
    }

    parseAppend(data: any) {
        this.append(JSON.stringify(data, null, 2));
    }
}