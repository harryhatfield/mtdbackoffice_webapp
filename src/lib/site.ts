/** Marketing pages are only indexable once the real domain is in use (avoids duplicate content on temp URLs). */
export const SITE_URL = "https://mtdbackoffice.co.uk";
export const indexable = /(^|\/\/)(www\.)?mtdbackoffice\.co\.uk/.test(process.env.APP_URL ?? "");
