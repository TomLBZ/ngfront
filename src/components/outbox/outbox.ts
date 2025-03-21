import { Input, Component } from '@angular/core';

@Component({
    selector: 'outbox',
    standalone: true,
    templateUrl: './outbox.html'
})
export class OutboxComponent {
    @Input() text: string = '';
    @Input() title: string = 'Outbox';
    @Input() clearable: boolean = true;

    clear(txt: string = "") {
        this.text = txt;
    }

    append(str: string, newline: boolean = true) {
        this.text += str;
        if (newline) this.text += '\n';
    }

    parseAppend(data: any, newline: boolean = true) {
        this.append(JSON.stringify(data, null, 2), newline);
    }
}