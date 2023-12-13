import type { Plugin } from 'vue';
import VisitorForm from '../components/form';
import VisitorLink from '../components/link';
import { route } from '../utils/route';
import { url } from '../utils/url';
import { $delete, $dispatch, $get, $patch, $post, $put, $redirect, $refresh, $toasts } from '../visitor';

export const VisitorPlugin: Plugin = {
  install(app) {
    app.component('VisitorForm', VisitorForm);
    app.component('VisitorLink', VisitorLink);

    app.config.globalProperties.route = route;
    app.config.globalProperties.url = url;

    app.config.globalProperties.$delete = $delete;
    app.config.globalProperties.$dispatch = $dispatch;
    app.config.globalProperties.$get = $get;
    app.config.globalProperties.$patch = $patch;
    app.config.globalProperties.$post = $post;
    app.config.globalProperties.$put = $put;
    app.config.globalProperties.$redirect = $redirect;
    app.config.globalProperties.$refresh = $refresh;
    app.config.globalProperties.$toasts = $toasts;
  },
};
