import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NewsFeedArticle, NewsFeedService } from '@data/news/news-feed.service';

const CONSORTIUM_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

describe('NewsFeedService', () => {
  let service: NewsFeedService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });

    service = TestBed.inject(NewsFeedService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('aggregates CTAN consortium news and maps useful category metadata', () => {
    const emissions: NewsFeedArticle[][] = [];

    service.loadFeed('es').subscribe((articles) => emissions.push([...articles]));

    for (const consortiumId of CONSORTIUM_IDS) {
      const request = httpTestingController.expectOne(
        `https://api.ctan.es/v1/Consorcios/${consortiumId}/noticias?lang=ES`
      );

      expect(request.request.method).toBe('GET');

      request.flush(
        consortiumId === 7
          ? [
              {
                idNoticia: 134,
                titulo: 'Cambio de servicio',
                resumen: '<p>Aviso para varias líneas.</p>',
                idCategoria: 3,
                categoria: 'Avisos de servicio',
                fechaInicio: '2026-08-28T08:00:00+02:00',
                fechaFin: '2026-09-01T23:59:00+02:00',
                novedad: 1,
                orden: 2
              }
            ]
          : []
      );
    }

    expect(emissions.at(-1)).toEqual([
      jasmine.objectContaining({
        consortiumId: 7,
        id: '134',
        title: 'Cambio de servicio',
        summary: 'Aviso para varias líneas.',
        category: 'Avisos de servicio',
        categoryId: '3',
        isNew: true
      })
    ]);
  });

  it('uses lang=EN and never falls back to Spanish-only title aliases', () => {
    const emissions: NewsFeedArticle[][] = [];

    service.loadFeed('en').subscribe((articles) => emissions.push([...articles]));

    for (const consortiumId of CONSORTIUM_IDS) {
      const request = httpTestingController.expectOne(
        `https://api.ctan.es/v1/Consorcios/${consortiumId}/noticias?lang=EN`
      );

      expect(request.request.method).toBe('GET');
      request.flush(
        consortiumId === 7
          ? [
              {
                idNoticia: 134,
                titulo: 'Service change',
                tituloEs: 'Cambio de servicio',
                resumen: 'Updated service information.',
                fechaInicio: '2026-08-28T08:00:00+02:00'
              },
              {
                idNoticia: 135,
                titulo: '',
                tituloEs: 'Solo disponible en español',
                resumen: 'Resumen español',
                fechaInicio: '2026-08-27T08:00:00+02:00'
              }
            ]
          : []
      );
    }

    expect(emissions.at(-1)).toEqual([
      jasmine.objectContaining({
        consortiumId: 7,
        id: '134',
        title: 'Service change'
      })
    ]);
  });

  it('keeps partial news results when one consortium endpoint fails', () => {
    const emissions: NewsFeedArticle[][] = [];

    service.loadFeed('es').subscribe((articles) => emissions.push([...articles]));

    for (const consortiumId of CONSORTIUM_IDS) {
      const request = httpTestingController.expectOne(
        `https://api.ctan.es/v1/Consorcios/${consortiumId}/noticias?lang=ES`
      );

      if (consortiumId === 1) {
        request.flush({ message: 'offline' }, { status: 503, statusText: 'Service Unavailable' });
        continue;
      }

      request.flush(
        consortiumId === 6
          ? [
              {
                idNoticia: 99,
                titulo: 'Servicio en Almería',
                resumen: 'Información actualizada.',
                fechaInicio: '2026-08-27T10:00:00+02:00'
              }
            ]
          : []
      );
    }

    expect(emissions.at(-1)?.map((article) => article.id)).toEqual(['99']);
  });

  it('fails the feed when every CTAN consortium endpoint is unavailable', () => {
    let error: unknown = null;

    service.loadFeed('es').subscribe({ error: (caught) => (error = caught) });

    for (const consortiumId of CONSORTIUM_IDS) {
      httpTestingController
        .expectOne(`https://api.ctan.es/v1/Consorcios/${consortiumId}/noticias?lang=ES`)
        .flush({ message: 'offline' }, { status: 503, statusText: 'Service Unavailable' });
    }

    expect(error).toEqual(jasmine.any(Error));
  });

  it('loads a first-party CTAN news detail instead of an external web link', () => {
    let detailTitle = '';
    let detailHtml = '';

    service.loadArticle(7, '134', 'es').subscribe((detail) => {
      detailTitle = detail.title;
      detailHtml = detail.contentHtml;
    });

    const request = httpTestingController.expectOne(
      'https://api.ctan.es/v1/Consorcios/7/noticias/134?lang=ES'
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      idNoticia: 134,
      titulo: 'Cambio de servicio',
      resumen: 'Resumen',
      texto: '<p>Contenido completo de la noticia.</p>',
      categoria: 'Avisos',
      fechaInicio: '2026-08-28T08:00:00+02:00'
    });

    expect(detailTitle).toBe('Cambio de servicio');
    expect(detailHtml).toBe('<p>Contenido completo de la noticia.</p>');
  });

  it('rejects an English detail that only exposes a Spanish title alias', () => {
    let error: unknown = null;

    service.loadArticle(7, '134', 'en').subscribe({ error: (caught) => (error = caught) });

    const request = httpTestingController.expectOne(
      'https://api.ctan.es/v1/Consorcios/7/noticias/134?lang=EN'
    );
    request.flush({
      idNoticia: 134,
      titulo: '',
      tituloEs: 'Cambio de servicio',
      resumen: 'Resumen español',
      texto: '<p>Contenido español.</p>'
    });

    expect(error).toEqual(jasmine.any(Error));
  });
});
