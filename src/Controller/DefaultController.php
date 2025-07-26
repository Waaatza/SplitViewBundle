<?php

namespace Watza\SplitViewBundle\Controller;

use Pimcore\Controller\FrontendController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class DefaultController extends FrontendController
{
    /**
     * @Route("/watza_split_view")
     */
    public function indexAction(Request $request): Response
    {
        return new Response('Hello world from watza_split_view');
    }
}
